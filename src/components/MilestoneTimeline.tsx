import { HolidayBand, Milestone, SprintBand } from "@/lib/types";

const DAY_WIDTH = 16;
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 35; // 5 weeks
const SPRINT_COLORS = ["#DCE7FB", "#EFE9FB"];

function parseDate(d: string): Date {
  return new Date(`${d}T00:00:00`);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

function formatShort(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function clamp(d: Date, min: Date, max: Date): Date {
  if (d < min) return min;
  if (d > max) return max;
  return d;
}

interface ProjectTimelineProps {
  milestones: Milestone[];
  sprints: SprintBand[];
  holidays: HolidayBand[];
}

export function ProjectTimeline({ milestones, sprints, holidays }: ProjectTimelineProps) {
  const rangeStart = new Date(new Date().toDateString()); // today, midnight
  const rangeEnd = new Date(rangeStart.getTime() + (WINDOW_DAYS - 1) * DAY_MS);
  const width = WINDOW_DAYS * DAY_WIDTH;

  const visibleSprints = sprints
    .filter((s) => parseDate(s.endDate) >= rangeStart && parseDate(s.startDate) <= rangeEnd)
    .map((s) => ({
      ...s,
      clippedStart: clamp(parseDate(s.startDate), rangeStart, rangeEnd),
      clippedEnd: clamp(parseDate(s.endDate), rangeStart, rangeEnd),
    }));

  const visibleHolidays = holidays
    .filter((h) => parseDate(h.endDate) >= rangeStart && parseDate(h.startDate) <= rangeEnd)
    .map((h) => ({
      ...h,
      clippedStart: clamp(parseDate(h.startDate), rangeStart, rangeEnd),
      clippedEnd: clamp(parseDate(h.endDate), rangeStart, rangeEnd),
    }));

  const visibleMilestones = milestones.filter((m) => {
    const d = parseDate(m.date);
    return d >= rangeStart && d <= rangeEnd;
  });

  if (visibleSprints.length === 0 && visibleMilestones.length === 0) {
    return (
      <div className="mt-6 rounded-2xl bg-white px-6 py-5">
        <div className="text-[14px] text-stone-500">Timeline</div>
        <div className="mt-3 text-[15px] text-stone-400">Nothing in the next 5 weeks</div>
      </div>
    );
  }

  const weekLabels: { x: number; label: string }[] = [];
  for (let d = 0; d < WINDOW_DAYS; d += 7) {
    weekLabels.push({
      x: d * DAY_WIDTH,
      label: formatShort(new Date(rangeStart.getTime() + d * DAY_MS)),
    });
  }

  return (
    <div className="mt-6 rounded-2xl bg-white px-6 py-5">
      <div className="text-[14px] text-stone-500">Timeline</div>
      <div className="mt-4 overflow-x-auto pt-16 pb-2">
        <div className="relative" style={{ width, height: 200 }}>
          {weekLabels.map((w) => (
            <span
              key={w.x}
              className="absolute top-0 text-[11px] text-stone-400"
              style={{ left: w.x }}
            >
              {w.label}
            </span>
          ))}

          <div
            className="absolute top-5"
            style={{
              left: 0,
              width,
              height: 8,
              backgroundImage: `repeating-linear-gradient(to right, #d6d3d1 0px, #d6d3d1 1px, transparent 1px, transparent ${DAY_WIDTH}px)`,
            }}
          />

          <div className="absolute" style={{ top: 34, left: 0, width, height: 28 }}>
            {visibleSprints.map((sprint, i) => {
              const startOffset = daysBetween(rangeStart, sprint.clippedStart);
              const spanDays = daysBetween(sprint.clippedStart, sprint.clippedEnd) + 1;
              return (
                <div
                  key={sprint.name}
                  className="group absolute h-full rounded-md"
                  style={{
                    left: startOffset * DAY_WIDTH,
                    width: spanDays * DAY_WIDTH,
                    backgroundColor: SPRINT_COLORS[i % SPRINT_COLORS.length],
                  }}
                >
                  <div className="pointer-events-none absolute bottom-full left-4 z-30 mb-2 w-[150px] rounded-lg bg-stone-800 px-2.5 py-2 text-[12px] leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                    {sprint.name} · {formatShort(parseDate(sprint.startDate))}–{formatShort(parseDate(sprint.endDate))}
                  </div>
                </div>
              );
            })}
            {visibleHolidays.map((h) => {
              const startOffset = daysBetween(rangeStart, h.clippedStart);
              const spanDays = daysBetween(h.clippedStart, h.clippedEnd) + 1;
              return (
                <div
                  key={`${h.personLabel}-${h.startDate}`}
                  className="group absolute z-10 h-full"
                  style={{
                    left: startOffset * DAY_WIDTH,
                    width: spanDays * DAY_WIDTH,
                    backgroundImage:
                      "repeating-linear-gradient(45deg, rgba(28,25,23,0.28) 0px, rgba(28,25,23,0.28) 4px, transparent 4px, transparent 8px)",
                  }}
                >
                  <div className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-[160px] rounded-lg bg-stone-800 px-2.5 py-2 text-[12px] leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                    {h.personLabel} · annual leave, {formatShort(parseDate(h.startDate))}–{formatShort(parseDate(h.endDate))}
                  </div>
                </div>
              );
            })}
          </div>

          {visibleMilestones.map((m) => {
            const offset = daysBetween(rangeStart, parseDate(m.date));
            return (
              <div
                key={`${m.title}-${m.date}`}
                className="group absolute top-0 z-20 w-px"
                style={{ left: offset * DAY_WIDTH }}
              >
                <div
                  className="absolute left-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#2554A8]"
                  style={{ top: 59 }}
                />
                <div
                  className="absolute left-0 w-0.5 -translate-x-1/2 bg-[#2554A8]"
                  style={{ top: 62, height: 30 }}
                />
                <div
                  className="absolute left-0 -translate-x-1/2 whitespace-nowrap text-center"
                  style={{ top: 96 }}
                >
                  <div className="text-[12px] font-medium text-stone-900">{m.title}</div>
                  <div className="mt-0.5 text-[11px] text-stone-500">{formatShort(parseDate(m.date))}</div>
                </div>
                {m.description && (
                  <div
                    className="pointer-events-none absolute left-0 z-30 w-[150px] -translate-x-1/2 rounded-lg bg-stone-800 px-2.5 py-2 text-[12px] leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
                    style={{ top: 132 }}
                  >
                    {m.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
