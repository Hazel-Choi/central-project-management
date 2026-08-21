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

  const toLocalISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return {
    iterationOrSprint: `Week of ${toLocalISO(monday)}`,
    startDate: toLocalISO(monday),
    endDate: toLocalISO(friday),
  };
}
