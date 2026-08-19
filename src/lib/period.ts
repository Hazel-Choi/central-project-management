export function getCurrentWeekPeriod(): {
  iterationOrSprint: string;
  startDate: string;
  endDate: string;
} {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  return {
    iterationOrSprint: `Week of ${toISO(monday)}`,
    startDate: toISO(monday),
    endDate: toISO(friday),
  };
}
