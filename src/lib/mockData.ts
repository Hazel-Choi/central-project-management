import { PortfolioTiles, ProjectDetail, ProjectSummaryRow, BurndownTicket } from "./types";
import { computeBurndown } from "./burndown";

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

const mockBurndownTickets: BurndownTicket[] = [
  { workItemId: 1, workItemType: "User Story", effortValue: 5, state: "Done", createdDate: "2026-07-20", stateChangeDate: "2026-07-28" },
  { workItemId: 2, workItemType: "User Story", effortValue: 8, state: "Done", createdDate: "2026-07-20", stateChangeDate: "2026-07-30" },
  { workItemId: 3, workItemType: "User Story", effortValue: 3, state: "Done", createdDate: "2026-07-22", stateChangeDate: "2026-08-01" },
  { workItemId: 4, workItemType: "User Story", effortValue: 5, state: "In progress", createdDate: "2026-07-22", stateChangeDate: "2026-07-27" },
  { workItemId: 5, workItemType: "Bug", effortValue: 2, state: "In progress", createdDate: "2026-07-29", stateChangeDate: "2026-07-29" },
  { workItemId: 6, workItemType: "User Story", effortValue: 3, state: "To do", createdDate: "2026-08-01", stateChangeDate: "2026-08-01" },
];

const argusSprint2 = { name: "Sprint 2", startDate: "2026-07-27", endDate: "2026-08-07" };
const argusBurndown = computeBurndown(
  mockBurndownTickets,
  new Date(argusSprint2.startDate),
  new Date(argusSprint2.endDate)
);

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
    currentSprintName: "Sprint 2",
    sprintBurndown: {
      sprint: argusSprint2,
      actual: argusBurndown.actual,
      ideal: argusBurndown.ideal,
    },
    statusBreakdown: {
      toDo: 3,
      inProgress: 5,
      inReview: 2,
      blocked: 1,
      done: 9,
    },
    milestones: [
      { title: "Kickoff", description: "Project charter signed off and team onboarded.", date: "2026-06-01" },
      { title: "UAT sign-off", description: "Final UAT walkthrough with client stakeholders before go-live sign-off.", date: "2026-08-19" },
      { title: "Client demo", description: "Live walkthrough of the full reporting dashboard for the client's ops team.", date: "2026-09-02" },
    ],
    sprints: [
      { name: "Sprint 2", startDate: "2026-07-27", endDate: "2026-08-07" },
      { name: "Sprint 3", startDate: "2026-08-10", endDate: "2026-08-21" },
      { name: "Sprint 4", startDate: "2026-08-24", endDate: "2026-09-04" },
      { name: "Sprint 5", startDate: "2026-09-07", endDate: "2026-09-18" },
    ],
    holidays: [
      { personLabel: "Hazel", startDate: "2026-08-20", endDate: "2026-08-25" },
    ],
    tickets: [
      {
        id: "ARG-142",
        title: "Add settlement exchange column to ADF pipeline",
        status: "In progress",
        assigneeInitials: "HM",
        updatedLabel: "2h ago",
        flagged: true,
        url: "#",
        sprintName: "Sprint 2",
      },
      {
        id: "ARG-138",
        title: "Backfill historical trade data 2024–2025",
        status: "In progress",
        assigneeInitials: "HM",
        updatedLabel: "today",
        flagged: true,
        url: "#",
        sprintName: "Sprint 2",
      },
      {
        id: "ARG-131",
        title: "Resolve duplicate trade reference keys",
        status: "Blocked",
        assigneeInitials: "HM",
        updatedLabel: "1d ago",
        flagged: true,
        url: "#",
        sprintName: "Sprint 2",
      },
      {
        id: "ARG-129",
        title: "Commissions measure — 30-day window logic",
        status: "In review",
        assigneeInitials: "DB",
        updatedLabel: "1d ago",
        flagged: false,
        url: "#",
        sprintName: "Sprint 2",
      },
      {
        id: "ARG-124",
        title: "Split Power BI homepage and child reports",
        status: "Done",
        assigneeInitials: "HM",
        updatedLabel: "3d ago",
        flagged: false,
        url: "#",
        sprintName: "Sprint 3",
      },
      {
        id: "ARG-119",
        title: "Fix dual-writer conflict on client dimension",
        status: "To do",
        assigneeInitials: "ZP",
        updatedLabel: "2d ago",
        flagged: true,
        url: "#",
        sprintName: "Sprint 2",
      },
    ],
  },
};
