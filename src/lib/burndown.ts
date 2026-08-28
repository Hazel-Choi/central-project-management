import { RemainingWorkSnapshot, HoursBurndownPoint, ScopeChangeEvent, SprintHoursBurndown, CapacitySnapshot } from "./types";

function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function enumerateWorkingDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function addWorkingDays(from: Date, count: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < count) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

export function computeHoursBurndown(
  snapshots: RemainingWorkSnapshot[],
  startDate: Date,
  endDate: Date,
  capacitySnapshots: CapacitySnapshot[] = []
): SprintHoursBurndown {
  const workingDays = enumerateWorkingDays(startDate, endDate);
  const totalWorkingDays = workingDays.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentDayIndex = workingDays.filter((d) => d <= today).length;
  currentDayIndex = Math.min(Math.max(currentDayIndex, 1), totalWorkingDays);

  // Group snapshots per ticket, sorted chronologically, so each day can look up
  // "the most recent known value on or before this day" instead of requiring
  // an exact same-day row. This is the forward-fill fix.
  const byTicket = new Map<number, RemainingWorkSnapshot[]>();
  snapshots.forEach((s) => {
    const list = byTicket.get(s.workItemId) ?? [];
    list.push(s);
    byTicket.set(s.workItemId, list);
  });
  byTicket.forEach((list) => list.sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate)));

  // Pointer per ticket: index of the latest snapshot known to be <= the day
  // currently being processed. Starts at -1 (ticket not yet seen).
  const pointer = new Map<number, number>();
  byTicket.forEach((_, id) => pointer.set(id, -1));

  const actual: HoursBurndownPoint[] = workingDays.map((day, i) => {
    const iso = toLocalDateString(day);
    const dayLabel = `Day ${i + 1}`;
    if (i + 1 > currentDayIndex) return { date: iso, dayLabel, remaining: null };

    let remaining = 0;
    byTicket.forEach((list, ticketId) => {
      let idx = pointer.get(ticketId)!;
      while (idx + 1 < list.length && list[idx + 1].snapshotDate <= iso) {
        idx++;
      }
      pointer.set(ticketId, idx);
      // idx === -1 means this ticket's first snapshot is still in the future
      // relative to this day — correctly excluded, not yet tracked/in scope.
      if (idx >= 0) {
        remaining += list[idx].remainingWorkHours;
      }
    });
    return { date: iso, dayLabel, remaining };
  });

  const totalHoursAtStart = actual[0]?.remaining ?? 0;
  const ideal: HoursBurndownPoint[] = workingDays.map((day, i) => {
    const iso = toLocalDateString(day);
    const remaining = Math.max(totalHoursAtStart * (1 - i / (totalWorkingDays - 1)), 0);
    return { date: iso, dayLabel: `Day ${i + 1}`, remaining };
  });

  const capacityByDate = new Map(capacitySnapshots.map((c) => [c.date, c.remainingCapacityHours]));
  const capacity: HoursBurndownPoint[] = workingDays.map((day, i) => {
    const iso = toLocalDateString(day);
    const value = capacityByDate.get(iso);
    return { date: iso, dayLabel: `Day ${i + 1}`, remaining: value ?? null };
  });

  // Scope additions — a ticket whose first snapshot appears after day 1
  const firstAppearance = new Map<number, { dayIndex: number; date: string; hours: number }>();
  snapshots.forEach((s) => {
    const dayIndex = workingDays.findIndex((d) => toLocalDateString(d) === s.snapshotDate);
    if (dayIndex === -1) return;
    const existing = firstAppearance.get(s.workItemId);
    if (!existing || dayIndex < existing.dayIndex) {
      firstAppearance.set(s.workItemId, { dayIndex, date: s.snapshotDate, hours: s.remainingWorkHours });
    }
  });
  const scopeChanges: ScopeChangeEvent[] = [];
  firstAppearance.forEach((v, workItemId) => {
    if (v.dayIndex > 0) {
      scopeChanges.push({ date: v.date, ticketId: workItemId, title: `Ticket ${workItemId}`, effortDelta: v.hours });
    }
  });

  const currentRemaining = actual[currentDayIndex - 1]?.remaining ?? 0;
  const elapsedDays = Math.max(currentDayIndex - 1, 1);
  const avgHoursPerDay = (totalHoursAtStart - currentRemaining) / elapsedDays;

  let projectedCompletionDate: string | null = null;
  if (avgHoursPerDay > 0 && currentRemaining > 0) {
    const daysNeeded = Math.ceil(currentRemaining / avgHoursPerDay);
    projectedCompletionDate = toLocalDateString(addWorkingDays(today, daysNeeded));
  }

  return {
    sprint: { name: "", startDate: toLocalDateString(startDate), endDate: toLocalDateString(endDate) },
    actual,
    ideal,
    capacity,
    scopeChanges,
    avgHoursPerDay,
    projectedCompletionDate,
    currentDayIndex,
    totalWorkingDays,
  };
}
