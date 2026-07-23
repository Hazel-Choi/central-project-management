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
 * NOTE FOR HAZEL: column names below are my best guess based on the schema
 * we've discussed (vw_ProjectSummary, vw_OutstandingTickets, core.Project,
 * core.WorkItem, core.WorkItem_History, core.StatusMapping). I haven't seen
 * the actual view DDL, so please check these against your real column names
 * before relying on them — the query shapes should be right even if a
 * column or two needs renaming.
 */

export async function getPortfolioTiles(): Promise<PortfolioTiles> {
  if (USE_MOCK_DATA) return mockPortfolioTiles;

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      COUNT(DISTINCT ProjectID)                                   AS activeProjects,
      SUM(OpenTicketCount)                                         AS openTickets,
      SUM(CASE WHEN Status = 'At risk' THEN 1 ELSE 0 END)          AS blocked
    FROM core.vw_ProjectSummary
    WHERE IsActive = 1;
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
      ProjectID       AS projectId,
      ProjectName     AS projectName,
      ClientName      AS clientName,
      Status          AS status,
      ProgressPercent AS progressPercent,
      OpenTicketCount AS openTicketCount,
      OwnerInitials   AS ownerInitials,
      Source          AS source
    FROM core.vw_ProjectSummary
    WHERE IsActive = 1
    ORDER BY ProjectName;
  `);

  return result.recordset as ProjectSummaryRow[];
}

export async function getProjectDetail(
  projectId: string
): Promise<ProjectDetail | null> {
  if (USE_MOCK_DATA) return mockProjectDetails[projectId] ?? null;

  const pool = await getPool();

  const headerResult = await pool
    .request()
    .input("projectId", sql.NVarChar, projectId).query(`
      SELECT
        p.ProjectID     AS projectId,
        p.ProjectName   AS projectName,
        p.ClientName    AS clientName,
        p.OwnerName     AS ownerName,
        p.Status        AS status,
        p.Source        AS source,
        p.ProgressPercent AS progressPercent
      FROM core.Project p
      WHERE p.ProjectID = @projectId;
    `);

  if (headerResult.recordset.length === 0) return null;
  const header = headerResult.recordset[0];

  const statusCountsResult = await pool
    .request()
    .input("projectId", sql.NVarChar, projectId).query(`
      SELECT
        sm.NormalizedStatus AS status,
        COUNT(*)            AS count
      FROM core.WorkItem wi
      JOIN core.StatusMapping sm ON sm.RawStatus = wi.RawStatus AND sm.Source = wi.Source
      WHERE wi.ProjectID = @projectId
      GROUP BY sm.NormalizedStatus;
    `);

  const counts: Record<string, number> = {};
  for (const row of statusCountsResult.recordset) {
    counts[row.status] = row.count;
  }

  const closed30dResult = await pool
    .request()
    .input("projectId", sql.NVarChar, projectId).query(`
      SELECT COUNT(DISTINCT wh.WorkItemID) AS closedLast30d
      FROM core.WorkItem_History wh
      JOIN core.StatusMapping sm ON sm.RawStatus = wh.NewStatus AND sm.Source = wh.Source
      WHERE wh.ProjectID = @projectId
        AND sm.NormalizedStatus = 'Done'
        AND wh.ChangedDate >= DATEADD(day, -30, GETUTCDATE());
    `);

  const ticketsResult = await pool
    .request()
    .input("projectId", sql.NVarChar, projectId).query(`
      SELECT TOP 6
        wi.WorkItemExternalID AS id,
        wi.Title              AS title,
        sm.NormalizedStatus   AS status,
        wi.AssigneeInitials   AS assigneeInitials,
        wi.UpdatedDate         AS updatedDate,
        wi.IsFlagged           AS flagged,
        wi.ExternalUrl          AS url
      FROM core.WorkItem wi
      JOIN core.StatusMapping sm ON sm.RawStatus = wi.RawStatus AND sm.Source = wi.Source
      WHERE wi.ProjectID = @projectId
      ORDER BY wi.UpdatedDate DESC;
    `);

  const tickets: Ticket[] = ticketsResult.recordset.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    assigneeInitials: row.assigneeInitials,
    updatedLabel: formatRelativeDate(row.updatedDate),
    flagged: !!row.flagged,
    url: row.url ?? "#",
  }));

  const openTicketCount =
    (counts["To do"] ?? 0) +
    (counts["In progress"] ?? 0) +
    (counts["In review"] ?? 0) +
    (counts["Blocked"] ?? 0);

  return {
    projectId: header.projectId,
    projectName: header.projectName,
    clientName: header.clientName,
    ownerName: header.ownerName,
    status: header.status,
    source: header.source,
    progressPercent: header.progressPercent,
    openTicketCount,
    blockedCount: counts["Blocked"] ?? 0,
    closedLast30d: closed30dResult.recordset[0]?.closedLast30d ?? 0,
    totalTicketCount:
      openTicketCount + (counts["Done"] ?? 0),
    statusBreakdown: {
      toDo: counts["To do"] ?? 0,
      inProgress: counts["In progress"] ?? 0,
      inReview: counts["In review"] ?? 0,
      blocked: counts["Blocked"] ?? 0,
      done: counts["Done"] ?? 0,
    },
    tickets,
  };
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "today";
  return `${diffDays}d ago`;
}
