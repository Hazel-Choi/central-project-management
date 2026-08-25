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
  status: ProjectStatus;
  progressPercent: number | null; // time-based: % of the way from StartDate to EndDate, as of today. null = no EndDate set (open-ended project). Clamped to 100 for bar width - see isOverdue for past-deadline signal.
  isOverdue: boolean; // true when today is past EndDate (unclamped ExpectedPercent > 100)
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
export interface ChildTask {
  id: string;
  title: string;
  originalEstimateHours: number;
  remainingWorkHours: number;
  percentConsumed: number | null;
}

export interface IndividualCapacityRow {
  personId: number | null;
  personInitials: string;        // "" for the unassigned row
  personName: string | null;
  remainingCapacityHours: number;
  remainingWorkHours: number;
  capacityDeltaHours: number;
  ragStatus: "Red" | "Amber" | "Green" | null;  // null for the unassigned row
  openItemCount: number;
}

export interface IndividualCapacityReport {
  projectCode: string;
  iterationOrSprint: string | null;
  periodType: "Sprint" | "Week" | null;
  rows: IndividualCapacityRow[];
  teamTotalCapacityHours: number;
  teamTotalRemainingWorkHours: number;
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
  percentConsumed?: number | null; // fraction 0-1 from vw_StoryTimeRollup; undefined on mock data, null if untracked
  timeFlag?: boolean; // true once percentConsumed crosses the 50% threshold; undefined on mock data
  childTasks?: ChildTask[]; // from vw_StoryTimeChildTasks, keyed by ParentId; undefined on mock data
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
export interface CapacitySnapshot {
  date: string; // ISO date, one row per working day
  remainingCapacityHours: number;
}
export interface SprintHoursBurndown {
  sprint: SprintBand;
  actual: HoursBurndownPoint[];
  ideal: HoursBurndownPoint[];
  capacity: HoursBurndownPoint[];
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
  ownerName: string;
  status: ProjectStatus;
  source: Source;
  progressPercent: number;
  timeElapsedPercent?: number | null; // % of the way from StartDate to EndDate, as of today
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
  sprintBurndown: SprintHoursBurndown | null;
}
