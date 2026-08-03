import { BurndownTicket, BurndownPoint } from '@/types';

const DONE_STATES = ['Closed', 'Done'];

export function computeBurndown(
  tickets: BurndownTicket[],
  startDate: Date,
  endDate: Date
): { actual: BurndownPoint[]; ideal: BurndownPoint[] } {
  const today = new Date();
  const lastDay = today < endDate ? today : endDate;
  const days = enumerateDays(startDate, lastDay);

  const totalScopeAtStart = tickets
    .filter(t => new Date(t.createdDate) <= startDate)
    .reduce((sum, t) => sum + (t.effortValue ?? 0), 0);

  const actual = days.map(day => {
    const remaining = tickets
      .filter(t => new Date(t.createdDate) <= day)
      .filter(t => !DONE_STATES.includes(t.state) || (t.stateChangeDate && new Date(t.stateChangeDate) > day))
      .reduce((sum, t) => sum + (t.effortValue ?? 0), 0);
    return { date: day.toISOString().slice(0, 10), remaining };
  });

  const totalSprintDays = daysBetween(startDate, endDate);
  const ideal = days.map(day => {
    const dayIndex = daysBetween(startDate, day);
    const remaining = Math.max(totalScopeAtStart * (1 - dayIndex / totalSprintDays), 0);
    return { date: day.toISOString().slice(0, 10), remaining };
  });

  return { actual, ideal };
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
