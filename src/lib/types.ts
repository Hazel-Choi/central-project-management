export type ProjectStatus = "In progress" | "On track" | "At risk" | "Done";
export type Source = "DevOps" | "Jira";
export type TicketStatus =
  | "To do"
  | "In progress"
  | "In review"
  | "Blocked"
  | "Done";

export interface PortfolioTiles {
  activeProjects: number;
  openTickets: number;
  blocked: number;
}

export interface ProjectSummaryRow {
  projectId: string;
  projectName: string;
  clientName: string;
  status: ProjectStatus;
  progressPercent: number;
  openTicketCount: number;
  ownerInitials: string;
  source: Source;
  renewalLabel?: string; // e.g. "Renewal · 12d" — omitted once Engagement metadata exists
  readyCount: number;
}

export interface StatusBreakdown {
  toDo: number;
  inProgress: number;
  inReview: number;
  blocked: number;
  done: number;
}

export interface Ticket {
  id: string; // e.g. "ARG-142"
  title: string;
  status: TicketStatus;
  assigneeInitials: string;
  updatedLabel: string; // e.g. "2h ago", "today", "3d ago"
  flagged: boolean; // drives the red dot next to blocked/at-risk tickets
  url: string;
  sprintName: string | null; // IterationOrSprint value; null if not tracked
}

export interface ProjectDetail {
  projectId: string;
  projectName: string;
  clientName: string;
  ownerName: string;
  status: ProjectStatus;
  source: Source;
  progressPercent: number;
  openTicketCount: number;
  blockedCount: number;
  closedLast30d: number;
  statusBreakdown: StatusBreakdown;
  tickets: Ticket[];
  totalTicketCount: number;
  currentSprintName: string | null; // null → this project is a board (Kanban), show all open tickets
}
