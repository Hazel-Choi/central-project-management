import { PortfolioTiles, ProjectDetail, ProjectSummaryRow } from "./types";

// This file stands in for `core.vw_ProjectSummary` / `core.vw_OutstandingTickets`
// while the ADF work-item pull is still being built out. Swap `USE_MOCK_DATA=false`
// in .env.local once those views are populated — the shapes here match the SQL
// query results in lib/queries.ts field-for-field, so no component changes
// should be needed when you cut over.

export const mockPortfolioTiles: PortfolioTiles = {
  activeProjects: 6,
  openTickets: 43,
  blocked: 3,
};

export const mockProjectSummaries: ProjectSummaryRow[] = [
  {
    projectId: "argus",
    projectName: "Project Argus",
    clientName: "Capital Markets Ltd",
    status: "In progress",
    progressPercent: 72,
    openTicketCount: 14,
    ownerInitials: "HM",
    source: "DevOps",
    readyCount: 5,
    milestones: [
      { name: "Kickoff", date: "2026-06-01" },        // past — will be filtered out, good test
      { name: "UAT sign-off", date: "2026-08-15" },
      { name: "Go-live", date: "2026-09-30" },
      { name: "Post-launch review", date: "2026-10-31" },
    ],
    currentSprintName: "Sprint 24", // set to null on one project later to test the board-view path
  },
  {
    projectId: "aim-rule-26",
    projectName: "AIM Rule 26 automation",
    clientName: "Nomad Advisory",
    status: "In progress",
    progressPercent: 75,
    openTicketCount: 5,
    ownerInitials: "DB",
    source: "DevOps",
    readyCount: 10,
  },
  {
    projectId: "check-centre",
    projectName: "Check Centre migration",
    clientName: "Internal",
    status: "At risk",
    progressPercent: 41,
    openTicketCount: 11,
    ownerInitials: "HM",
    source: "DevOps",
    readyCount: 3,
  },
  {
    projectId: "pershing-nexus",
    projectName: "Pershing Nexus automation",
    clientName: "Brokerage Co",
    status: "In progress",
    progressPercent: 55,
    openTicketCount: 9,
    ownerInitials: "ZP",
    source: "Jira",
    renewalLabel: "Renewal · 12d",
    readyCount: 8,
  },
  {
    projectId: "lse-rns",
    projectName: "LSE RNS tracker",
    clientName: "Potter & Moore Plc",
    status: "On track",
    progressPercent: 93,
    openTicketCount: 3,
    ownerInitials: "HM",
    source: "Jira",
    readyCount: 27,
  },
  {
    projectId: "neonatal",
    projectName: "Neonatal data study",
    clientName: "NeoTree",
    status: "Done",
    progressPercent: 100,
    openTicketCount: 0,
    ownerInitials: "DB",
    source: "Jira",
    readyCount: 0,
  },
];

export const mockProjectDetails: Record<string, ProjectDetail> = {
  argus: {
    projectId: "argus",
    projectName: "Project Argus",
    clientName: "Capital Markets Ltd",
    ownerName: "Hazel M",
    status: "In progress",
    source: "DevOps",
    progressPercent: 72,
    openTicketCount: 14,
    blockedCount: 1,
    closedLast30d: 9,
    totalTicketCount: 14,
    statusBreakdown: {
      toDo: 3,
      inProgress: 5,
      inReview: 2,
      blocked: 1,
      done: 9,
    },
    tickets: [
      {
        id: "ARG-142",
        title: "Add settlement exchange column to ADF pipeline",
        status: "In progress",
        assigneeInitials: "HM",
        updatedLabel: "2h ago",
        flagged: true,
        url: "#",
      },
      {
        id: "ARG-138",
        title: "Backfill historical trade data 2024–2025",
        status: "In progress",
        assigneeInitials: "HM",
        updatedLabel: "today",
        flagged: true,
        url: "#",
      },
      {
        id: "ARG-131",
        title: "Resolve duplicate trade reference keys",
        status: "Blocked",
        assigneeInitials: "HM",
        updatedLabel: "1d ago",
        flagged: true,
        url: "#",
      },
      {
        id: "ARG-129",
        title: "Commissions measure — 30-day window logic",
        status: "In review",
        assigneeInitials: "DB",
        updatedLabel: "1d ago",
        flagged: false,
        url: "#",
      },
      {
        id: "ARG-124",
        title: "Split Power BI homepage and child reports",
        status: "Done",
        assigneeInitials: "HM",
        updatedLabel: "3d ago",
        flagged: false,
        url: "#",
      },
      {
        id: "ARG-119",
        title: "Fix dual-writer conflict on client dimension",
        status: "To do",
        assigneeInitials: "ZP",
        updatedLabel: "2d ago",
        flagged: true,
        url: "#",
      },
    ],
  },
};
