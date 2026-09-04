import { getPool, sql } from "./db";
import { computeHoursBurndown } from "./burndown";
import { getInitials } from "@/lib/initials";
import {
  HolidayBand,
  Milestone,
  PortfolioTiles,
  ProjectDetail,
  ProjectSummaryRow,
  SprintBand,
  Ticket,
  ChildTask,
  RemainingWorkSnapshot,
  SprintHoursBurndown,
  CapacitySnapshot,
  IndividualCapacityReport,
  IndividualCapacityRow,
} from "./types";
import {
  mockPortfolioTiles,
  mockProjectDetails,
  mockProjectSummaries,
} from "./mockData";

// Flip this once core.vw_ProjectSummary / core.vw_OutstandingTickets are
// actually populated. Kept as an env var (not a hardcoded const) so it can
// differ between local dev and deployed environments without a code change.
const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== "false";

/**
 * Column names below match the actual live schema:
 * - core.vw_ProjectSummary (ProjectCode, ClientDisplayLabel, ProjectOwnerName/Initials,
 *   ProgressPercent, OpenTicketCount, BlockedCount, ReadyCount, ClosedLast30d,
 *   ToDoCount/InProgressCount/InReviewCount/BlockedBucketCount/DoneCount, Status)
 * - core.vw_OutstandingTickets (ProjectCode, WorkItemId, Title, State, AssignedTo,
 *   ChangedDate, Flagged)
 * IsActive filtering already happens inside vw_ProjectSummary itself (WHERE
 * p.IsActive = 1 in the view definition), so queries here don't repeat it.
 *
 * Sprint-name matching note: core.Sprint.SprintName is the short, admin-typed
 * name (e.g. "Sprint 2"). The literal IterationOrSprint values on tickets can
 * drift from that (e.g. "Dark Spark Internal Projects\Internal Projects -
 * Sprint 2" for DKSP-SCRM). core.vw_ResolvedCurrentSprint resolves the short
 * name to whichever literal tail actually has ticket activity inside the
 * sprint's real date window, and that resolved value - not the raw
 * SprintName - is what must be bound into any IterationOrSprint LIKE match
 * against SharePointWorkItem-derived data. The raw short name is still
 * correct for anything keyed off core.Sprint itself (date-range lookups,
 * the burndown presence check, and the value shown to the person in the UI).
 */

export async function getPortfolioTiles(): Promise<PortfolioTiles> {
  if (USE_MOCK_DATA) return mockPortfolioTiles;

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      COUNT(*) AS activeProjects,
      SUM(OpenTicketCount) AS openTickets,
      SUM(CASE WHEN Status = 'At risk' THEN 1 ELSE 0 END) AS blocked
    FROM core.vw_ProjectSummary;
  `);

  const row = result.recordset[0];
  return {
    activeProjects: row.activeProjects ?? 0,
    openTickets: row.openTickets ?? 0,
    blocked: row.blocked ?? 0,
  };
}

export async function getLastRefreshTime(): Promise<Date> {
  if (USE_MOCK_DATA) return new Date();

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT MAX(LastModifiedUtc) AS LastRefreshed
    FROM core.SharePointWorkItem;
  `);

  return result.recordset[0]?.LastRefreshed ?? new Date();
}

export async function getActiveProjects(): Promise<{ code: string; name: string }[]> {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT ProjectCode, ProjectName
    FROM core.vw_ProjectSummary
    ORDER BY ProjectName;
  `);
  return result.recordset.map((row) => ({
    code: row.ProjectCode,
    name: row.ProjectName,
  }));
}

export async function getProjectPeople(
  projectCode: string
): Promise<{ personId: number; displayLabel: string }[]> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("projectCode", sql.NVarChar, projectCode).query(`
      SELECT DISTINCT p.PersonId, p.DisplayLabel
      FROM core.ProjectAssignment pa
      JOIN core.Person p ON p.PersonId = pa.PersonId
      WHERE pa.ProjectCode = @projectCode
        AND p.IsActive = 1
      ORDER BY p.DisplayLabel;
    `);
  return result.recordset.map((row) => ({
    personId: row.PersonId,
    displayLabel: row.DisplayLabel,
  }));
}

export async function getIndividualCapacityReport(
  projectCode: string
): Promise<IndividualCapacityReport> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("projectCode", sql.NVarChar, projectCode).query(`
      SELECT
        ProjectCode, IterationOrSprint, PeriodType, PersonId, PersonName,
        RemainingCapacityHours, RemainingWorkHours, OpenItemCount,
        CapacityDeltaHours, RagStatus
      FROM core.vw_IndividualCapacityReport
      WHERE ProjectCode = @projectCode
      ORDER BY
        CASE RagStatus WHEN 'Red' THEN 0 WHEN 'Amber' THEN 1 WHEN 'Green' THEN 2 ELSE 3 END,
        PersonName;
    `);

  const rows: IndividualCapacityRow[] = result.recordset.map((row) => ({
    personId: row.PersonId,
    personInitials: getInitials(row.PersonName),
    personName: row.PersonName,
    remainingCapacityHours: row.RemainingCapacityHours ?? 0,
    remainingWorkHours: row.RemainingWorkHours ?? 0,
    capacityDeltaHours: row.CapacityDeltaHours ?? 0,
    ragStatus: row.RagStatus,
    openItemCount: row.OpenItemCount ?? 0,
  }));

  // Team capacity total excludes the unassigned row (personId null) — capacity
  // is a per-person figure and has no meaning for unassigned work.
  const teamTotalCapacityHours = rows
    .filter((r) => r.personId != null)
    .reduce((sum, r) => sum + r.remainingCapacityHours, 0);

  // Team remaining work total includes everyone, unassigned included, since
  // that's genuinely outstanding effort regardless of who (if anyone) owns it.
  const teamTotalRemainingWorkHours = rows.reduce((sum, r) => sum + r.remainingWorkHours, 0);

  // Pick period info from any row that actually has it — a person with
  // remaining work but no capacity/assignment row would show IterationOrSprint
  // as NULL on their own row, so don't just take recordset[0] blindly.
  const periodRow = result.recordset.find((r) => r.IterationOrSprint != null);

  return {
    projectCode,
    iterationOrSprint: periodRow?.IterationOrSprint ?? null,
    periodType: periodRow?.PeriodType ?? null,
    rows,
    teamTotalCapacityHours,
    teamTotalRemainingWorkHours,
  };
}

export async function getProjectSummaries(): Promise<ProjectSummaryRow[]> {
  if (USE_MOCK_DATA) return mockProjectSummaries;

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      ProjectCode,
      ProjectName,
      ProjectOwnerInitials,
      Status,
      ExpectedPercent,
      OpenTicketCount,
      ReadyCount
    FROM core.vw_ProjectSummary
    ORDER BY ProjectName;
  `);

  return result.recordset.map(
    (row): ProjectSummaryRow => ({
      projectId: row.ProjectCode,
      projectName: row.ProjectName,
      status: row.Status,
      // Time-based: how far along the project is between StartDate and
      // EndDate, not ticket completion. null when EndDate isn't set (view
      // returns NULL for open-ended projects rather than a fake 0/100).
      progressPercent:
        row.ExpectedPercent == null ? null : Math.min(100, Math.round(row.ExpectedPercent)),
      isOverdue: row.ExpectedPercent != null && row.ExpectedPercent > 100,
      openTicketCount: row.OpenTicketCount ?? 0,
      ownerInitials: row.ProjectOwnerInitials ?? "",
      source: "DevOps", // hardcoded until Jira is actually wired in
      readyCount: row.ReadyCount ?? 0,
    })
  );
}

export async function getProjectDetail(
  projectCode: string
): Promise<ProjectDetail | null> {
  if (USE_MOCK_DATA) return mockProjectDetails[projectCode] ?? null;

  const pool = await getPool();

  // Resolved literal tail (e.g. "Internal Projects - Sprint 2") - used ONLY
  // for matching against real IterationOrSprint ticket strings below. Never
  // use this for date-range lookups or anything shown to the person.
  const resolvedResult = await pool
    .request()
    .input("projectCode", sql.NVarChar, projectCode).query(`
      SELECT ResolvedIterationOrSprint FROM core.vw_ResolvedCurrentSprint WHERE ProjectCode = @projectCode;
    `);
  const resolvedSprintName: string | null = resolvedResult.recordset[0]?.ResolvedIterationOrSprint ?? null;

  const summaryResult = await pool
    .request()
    .input("projectCode", sql.NVarChar, projectCode).query(`
      SELECT
        ProjectCode,
        ProjectName,
        ProjectOwnerName,
        Status,
        ProgressPercent,
        ExpectedPercent,
        OpenTicketCount,
        BlockedCount,
        ClosedLast30d,
        ToDoCount,
        InProgressCount,
        InReviewCount,
        BlockedBucketCount,
        DoneCount,
        TotalTicketCount
      FROM core.vw_ProjectSummary
      WHERE ProjectCode = @projectCode;
    `);

  if (summaryResult.recordset.length === 0) return null;
  const summary = summaryResult.recordset[0];

  const [sprintsResult, milestonesResult, holidaysResult] = await Promise.all([
    pool
      .request()
      .input("projectCode", sql.NVarChar, projectCode).query(`
        SELECT SprintName, StartDate, EndDate, TeamCapacity
        FROM core.Sprint
        WHERE ProjectCode = @projectCode
        ORDER BY StartDate;
      `),
    pool
      .request()
      .input("projectCode", sql.NVarChar, projectCode).query(`
        SELECT Title, Description, MilestoneDate
        FROM core.Milestone
        WHERE ProjectCode = @projectCode
        ORDER BY MilestoneDate;
      `),
    pool
      .request()
      .input("projectCode", sql.NVarChar, projectCode).query(`
        SELECT PersonLabel, StartDate, EndDate
        FROM core.vw_ProjectHolidays
        WHERE ProjectCode = @projectCode
        ORDER BY StartDate;
      `),
  ]);

  const sprints: SprintBand[] = sprintsResult.recordset.map((row) => ({
    name: row.SprintName,
    startDate: toDateOnlyString(row.StartDate),
    endDate: toDateOnlyString(row.EndDate),
  }));

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const currentSprintBand =
    sprints.find((s) => s.startDate <= today && today <= s.endDate) ?? null;
  // Short, admin-typed name - correct for display and for the date-range
  // lookup above. NOT used below for matching real ticket strings.
  const currentSprintName = currentSprintBand?.name ?? null;

  const [ticketsResult, burndownResult, childTasksResult, capacityResult] = await Promise.all([
    pool
      .request()
      .input("projectCode", sql.NVarChar, projectCode)
      .input("currentSprintName", sql.NVarChar, resolvedSprintName).query(`
        SELECT
          w.WorkItemId,
          w.Title,
          w.State,
          w.AssignedTo,
          w.ChangedDate,
          w.Flagged,
          w.IterationOrSprint,
          r.PercentConsumed,
          r.TimeFlag
        FROM core.vw_OutstandingTickets w
        LEFT JOIN core.vw_StoryTimeRollup r
          ON r.ProjectCode = w.ProjectCode
         AND r.WorkItemId = w.WorkItemId
        WHERE w.ProjectCode = @projectCode
          AND (@currentSprintName IS NULL OR w.IterationOrSprint LIKE '%\' + @currentSprintName)
        ORDER BY w.ChangedDate DESC;
      `),
    pool
      .request()
      .input("projectCode", sql.NVarChar, projectCode)
      .input("currentSprintName", sql.NVarChar, resolvedSprintName).query(`
        SELECT
          WorkItemId AS workItemId,
          SnapshotDate AS snapshotDate,
          RemainingWorkHours AS remainingWorkHours
        FROM core.vw_SprintBurndownHistory
        WHERE ProjectCode = @projectCode
          AND @currentSprintName IS NOT NULL
          AND IterationOrSprint LIKE '%\' + @currentSprintName;
      `),
    pool
      .request()
      .input("projectCode", sql.NVarChar, projectCode).query(`
        SELECT
          ParentId,
          WorkItemId,
          Title,
          OriginalEstimateHours,
          RemainingWorkHours,
          PercentConsumed
        FROM core.vw_StoryTimeChildTasks
        WHERE ProjectCode = @projectCode;
      `),
    pool
      .request()
      .input("projectCode", sql.NVarChar, projectCode)
      .input("currentSprintName", sql.NVarChar, resolvedSprintName).query(`
        SELECT
          CalendarDate AS calendarDate,
          RemainingCapacityHours AS remainingCapacityHours
        FROM core.vw_SprintCapacityHistory
        WHERE ProjectCode = @projectCode
          AND @currentSprintName IS NOT NULL
          AND IterationOrSprint LIKE '%\' + @currentSprintName;
      `),
  ]);

  const childTasksByParentId = new Map<string, ChildTask[]>();
  for (const row of childTasksResult.recordset) {
    const parentId = String(row.ParentId);
    const list = childTasksByParentId.get(parentId) ?? [];
    list.push({
      id: row.WorkItemId,
      title: row.Title,
      originalEstimateHours: row.OriginalEstimateHours,
      remainingWorkHours: row.RemainingWorkHours,
      percentConsumed: row.PercentConsumed ?? null,
    });
    childTasksByParentId.set(parentId, list);
  }

  const tickets: Ticket[] = ticketsResult.recordset.map((row) => ({
    id: row.WorkItemId,
    title: row.Title,
    status: row.State,
    assigneeInitials: initialsFromAssignee(row.AssignedTo),
    updatedLabel: formatRelativeDate(row.ChangedDate),
    flagged: !!row.Flagged,
    url: "#",
    sprintName: row.IterationOrSprint ?? null,
    percentConsumed: row.PercentConsumed ?? null,
    timeFlag: !!row.TimeFlag,
    childTasks: childTasksByParentId.get(String(row.WorkItemId)) ?? [],
  }));

  const milestones: Milestone[] = milestonesResult.recordset.map((row) => ({
    title: row.Title,
    description: row.Description ?? "",
    date: toDateOnlyString(row.MilestoneDate),
  }));

  let sprintBurndown: SprintHoursBurndown | null = null;
  if (currentSprintName && currentSprintBand) {
    const snapshots: RemainingWorkSnapshot[] = burndownResult.recordset.map((row) => ({
      workItemId: row.workItemId,
      snapshotDate: toDateOnlyString(row.snapshotDate),
      remainingWorkHours: row.remainingWorkHours,
    }));

    const capacitySnapshots: CapacitySnapshot[] = capacityResult.recordset.map((row) => ({
      date: toDateOnlyString(row.calendarDate),
      remainingCapacityHours: row.remainingCapacityHours,
    }));

    sprintBurndown = computeHoursBurndown(
      snapshots,
      new Date(currentSprintBand.startDate),
      new Date(currentSprintBand.endDate),
      capacitySnapshots
    );
  }

  const holidays: HolidayBand[] = holidaysResult.recordset.map((row) => ({
    personLabel: row.PersonLabel,
    startDate: toDateOnlyString(row.StartDate),
    endDate: toDateOnlyString(row.EndDate),
  }));

  return {
    projectId: summary.ProjectCode,
    projectName: summary.ProjectName,
    ownerName: summary.ProjectOwnerName ?? "",
    status: summary.Status,
    source: "DevOps",
    progressPercent: Math.round(summary.ProgressPercent ?? 0),
    timeElapsedPercent:
      summary.ExpectedPercent == null ? null : Math.min(100, Math.round(summary.ExpectedPercent)),
    openTicketCount: summary.OpenTicketCount ?? 0,
    blockedCount: summary.BlockedCount ?? 0,
    closedLast30d: summary.ClosedLast30d ?? 0,
    totalTicketCount: summary.TotalTicketCount ?? tickets.length,
    statusBreakdown: {
      toDo: summary.ToDoCount ?? 0,
      inProgress: summary.InProgressCount ?? 0,
      inReview: summary.InReviewCount ?? 0,
      blocked: summary.BlockedBucketCount ?? 0,
      done: summary.DoneCount ?? 0,
    },
    tickets,
    currentSprintName,
    milestones,
    sprints,
    holidays,
    sprintBurndown,
  };
}

function toDateOnlyString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** AssignedTo comes through as an email (e.g. hazel.choi@darksparkconsulting.com)
 * from the payload, not a precomputed initials value — derive it here. */
function initialsFromAssignee(assignedTo: string | null): string {
  if (!assignedTo) return "";
  if (assignedTo.includes("@")) {
    // Email format (AzureDevOps): "hazel.choi@..." -> "HC"
    const namePart = assignedTo.split("@")[0];
    return namePart
      .split(/[._]/)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2);
  }
  // Plain display name format (Jira): "Tej Shankar Murthy" -> "TM"
  const parts = assignedTo.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelativeDate(date: Date | string | null): string {
  if (!date) return "";
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "today";
  return `${diffDays}d ago`;
}
