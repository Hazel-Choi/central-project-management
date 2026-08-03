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

export interface Milestone {
  title: string;
  description: string;
  date: string; // ISO date, e.g. "2026-08-15"
}

export interface MilestoneRecord extends Milestone {
  id: number;
}

export interface SprintBand {
  name: string;
  startDate: string;
  endDate: string;
}

export interface RemainingWorkSnapshot {
  workItemId: number;
  snapshotDate: string; // ISO date — one row per working day, once live
  remainingWorkHours: number;
}

export interface HoursBurndownPoint {
  date: string;
  dayLabel: string; // "Day 3"
  remaining: number | null; // null = no data yet (future working day)
}

export interface SprintHoursBurndown {
  sprint: SprintBand;
  actual: HoursBurndownPoint[];
  ideal: HoursBurndownPoint[];
  scopeChanges: ScopeChangeEvent[];
  avgHoursPerDay: number;
  projectedCompletionDate: string | null;
  currentDayIndex: number;
  totalWorkingDays: number;
}

export interface ScopeChangeEvent {
  date: string;
  ticketId: number;
  title: string;
  effortDelta: number; // hours added; additions only, no removal signal yet
}

export interface HolidayBand {
  personLabel: string; // e.g. "HM"
  startDate: string;
  endDate: string;
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
  milestones: Milestone[];
  sprints: SprintBand[];
  holidays: HolidayBand[];
  currentSprintName: string | null; // null → this project is a board (Kanban), show all open tickets
  sprintHoursBurndown: SprintBurndown | null;
}
