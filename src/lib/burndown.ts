import { RemainingWorkSnapshot, HoursBurndownPoint, ScopeChangeEvent, SprintHoursBurndown, CapacitySnapshot } from "./types";

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

  const actual: HoursBurndownPoint[] = workingDays.map((day, i) => {
    const iso = day.toISOString().slice(0, 10);
    const dayLabel = `Day ${i + 1}`;
    if (i + 1 > currentDayIndex) return { date: iso, dayLabel, remaining: null };
    const remaining = snapshots
      .filter((s) => s.snapshotDate === iso)
      .reduce((sum, s) => sum + s.remainingWorkHours, 0);
    return { date: iso, dayLabel, remaining };
  });

  const totalHoursAtStart = actual[0]?.remaining ?? 0;
  const ideal: HoursBurndownPoint[] = workingDays.map((day, i) => {
    const iso = day.toISOString().slice(0, 10);
    const remaining = Math.max(totalHoursAtStart * (1 - i / (totalWorkingDays - 1)), 0);
    return { date: iso, dayLabel: `Day ${i + 1}`, remaining };
  });

  const capacityByDate = new Map(capacitySnapshots.map((c) => [c.date, c.remainingCapacityHours]));
  const capacity: HoursBurndownPoint[] = workingDays.map((day, i) => {
    const iso = day.toISOString().slice(0, 10);
    const value = capacityByDate.get(iso);
    return { date: iso, dayLabel: `Day ${i + 1}`, remaining: value ?? null };
  });

  // Scope additions — a ticket whose first snapshot appears after day 1
  const firstAppearance = new Map<number, { dayIndex: number; date: string; hours: number }>();
  snapshots.forEach((s) => {
    const dayIndex = workingDays.findIndex((d) => d.toISOString().slice(0, 10) === s.snapshotDate);
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
    projectedCompletionDate = addWorkingDays(today, daysNeeded).toISOString().slice(0, 10);
  }

  return {
    sprint: { name: "", startDate: startDate.toISOString().slice(0, 10), endDate: endDate.toISOString().slice(0, 10) },
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

function enumerateDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
