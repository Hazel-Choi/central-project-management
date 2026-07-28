import { getPool, sql } from "./db";
import {
  PortfolioTiles,
  ProjectDetail,
  ProjectSummaryRow,
  Ticket,
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
 
export async function getProjectSummaries(): Promise<ProjectSummaryRow[]> {
  if (USE_MOCK_DATA) return mockProjectSummaries;
 
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      ProjectCode,
      ProjectName,
      ClientDisplayLabel,
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
      clientName: row.ClientDisplayLabel,
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
        ClientDisplayLabel,
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
        TotalTicketCount,
        CurrentSprintName
      FROM core.vw_ProjectSummary
      WHERE ProjectCode = @projectCode;
    `);
 
  if (summaryResult.recordset.length === 0) return null;
  const summary = summaryResult.recordset[0];
  const currentSprintName: string | null = summary.CurrentSprintName ?? null;

  const ticketsResult = await pool
    .request()
    .input("projectCode", sql.NVarChar, projectCode)
    .input("currentSprintName", sql.NVarChar, currentSprintName).query(`
      SELECT
        WorkItemId,
        Title,
        State,
        AssignedTo,
        ChangedDate,
        Flagged,
        IterationOrSprint
      FROM core.vw_OutstandingTickets
      WHERE ProjectCode = @projectCode
        AND (@currentSprintName IS NULL OR IterationOrSprint = @currentSprintName)
      ORDER BY ChangedDate DESC;
    `);
 
  const tickets: Ticket[] = ticketsResult.recordset.map((row) => ({
    id: row.WorkItemId,
    title: row.Title,
    status: row.State,
    assigneeInitials: initialsFromEmail(row.AssignedTo),
    updatedLabel: formatRelativeDate(row.ChangedDate),
    flagged: !!row.Flagged,
    // No per-ticket source URL captured in the payload yet — placeholder
    // until that's added to the CSV spec or computed from org/project/id.
    url: "#",
    sprintName: row.IterationOrSprint ?? null,
  }));
 
  return {
    projectId: summary.ProjectCode,
    projectName: summary.ProjectName,
    clientName: summary.ClientDisplayLabel,
    ownerName: summary.ProjectOwnerName ?? "",
    status: summary.Status,
    source: "DevOps", // hardcoded until Jira is actually wired in
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
  };
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
