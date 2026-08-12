import { getPool, sql } from "./db";
import { computeHoursBurndown } from "./burndown";
import {
  HolidayBand,
  Milestone,
  PortfolioTiles,
  ProjectDetail,
  ProjectSummaryRow,
  SprintBand,
  Ticket,
  RemainingWorkSnapshot,
  SprintHoursBurndown,
  CapacitySnapshot,
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

export async function getProjectSummaries(): Promise<ProjectSummaryRow[]> {
  if (USE_MOCK_DATA) return mockProjectSummaries;
 
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      ProjectCode,
      ProjectName,
      ProjectOwnerInitials,
      Status,
      ProgressPercent,
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
      progressPercent: Math.round(row.ProgressPercent ?? 0),
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
 
  const summaryResult = await pool
    .request()
    .input("projectCode", sql.NVarChar, projectCode).query(`
      SELECT
        ProjectCode,
        ProjectName,
        ProjectOwnerName,
        Status,
        ProgressPercent,
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

  const today = new Date().toISOString().slice(0, 10);
  const currentSprintBand =
    sprints.find((s) => s.startDate <= today && today <= s.endDate) ?? null;
  const currentSprintName = currentSprintBand?.name ?? null;
  // TEMP : flat team capacity for current sprint
  const currentSprintRawRow = sprintsResult.recordset.find(
    (row) => row.SprintName === currentSprintName
  );
  const teamCapacity: number | null =
    currentSprintRawRow?.TeamCapacity ?? null;


  

  const [ticketsResult, burndownResult/*, capacityResult*/] = await Promise.all([
    pool
      .request()
      .input("projectCode", sql.NVarChar, projectCode)
      .input("currentSprintName", sql.NVarChar, currentSprintName).query(`
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
          AND (@currentSprintName IS NULL OR w.IterationOrSprint LIKE '%' + @currentSprintName + '%')
        ORDER BY w.ChangedDate DESC;
      `),
    pool
      .request()
      .input("projectCode", sql.NVarChar, projectCode)
      .input("currentSprintName", sql.NVarChar, currentSprintName).query(`
        SELECT
          WorkItemId AS workItemId,
          SnapshotDate AS snapshotDate,
          RemainingWorkHours AS remainingWorkHours
        FROM core.vw_SprintBurndownHistory
        WHERE ProjectCode = @projectCode
          AND @currentSprintName IS NOT NULL
          AND IterationOrSprint LIKE '%' + @currentSprintName + '%';
      `),
    // --- Temporarily disabled --
    //pool
      //.request()
      //.input("projectCode", sql.NVarChar, projectCode)
      //.input("currentSprintName", sql.NVarChar, currentSprintName).query(`
        //SELECT
          //CalendarDate AS calendarDate,
          //RemainingCapacityHours AS remainingCapacityHours
        //FROM core.vw_SprintCapacityHistory
        //WHERE ProjectCode = @projectCode
          //AND @currentSprintName IS NOT NULL
          //AND IterationOrSprint LIKE '%' + @currentSprintName + '%';
      //`),
  ]);

  const tickets: Ticket[] = ticketsResult.recordset.map((row) => ({
    id: row.WorkItemId,
    title: row.Title,
    status: row.State,
    assigneeInitials: initialsFromEmail(row.AssignedTo),
    updatedLabel: formatRelativeDate(row.ChangedDate),
    flagged: !!row.Flagged,
    url: "#",
    sprintName: row.IterationOrSprint ?? null,
    percentConsumed: row.PercentConsumed ?? null,
    timeFlag: !!row.TimeFlag,
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

    // TEMP: flat team capacity
    // shape as the 'ideal' trend line
    //const capacitySnapshots: CapacitySnapshot[] = capacityResult.recordset.map((row) => ({
      //date: toDateOnlyString(row.calendarDate),
      //remainingCapacityHours: row.remainingCapacityHours,
    //}));
    const capacitySnapshots: CapacitySnapshot[] = (() => {
      if (teamCapacity == null) return [];
      const days = enumerateWorkingDaysSimple(
        new Date(currentSprintBand.startDate),
        new Date(currentSprintBand.endDate)
      );
      const totalDays = days.length;
      return days.map((iso, i) => ({
        date: iso,
        remainingCapacityHours: Math.max(
          teamCapacity * (1 - i / Math.max(totalDays - 1, 1)),
          0
        ),
      }));
    })();

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
  return date.toISOString().slice(0, 10);
}

/** AssignedTo comes through as an email (e.g. hazel.choi@darksparkconsulting.com)
 * from the payload, not a precomputed initials value — derive it here. */
function initialsFromEmail(email: string | null): string {
  if (!email) return "";
  const namePart = email.split("@")[0];
  return namePart
    .split(/[._]/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
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


// TEMP helper for the flat-capacity stopgap — mirrors the working-day logic
// in burndown.ts. Remove when reviving the computed capacity view.
function enumerateWorkingDaysSimple(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
