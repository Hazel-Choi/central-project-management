import { Milestone } from "@/lib/types";

export function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  const today = new Date(new Date().toDateString());
  const upcoming = milestones
    .filter((m) => new Date(m.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="mt-6 rounded-2xl bg-white px-6 py-5">
      <div className="text-[14px] text-stone-500">Milestones</div>
      {upcoming.length === 0 ? (
        <div className="mt-3 text-[15px] text-stone-400">No upcoming milestones</div>
      ) : (
        <div className="mt-8 overflow-x-auto pb-1">
          <div className="relative flex min-w-max gap-12 px-4">
            <div className="absolute left-4 right-4 top-2 h-[2px] bg-stone-200" />
            {upcoming.map((m) => (
              <div
                key={`${m.name}-${m.date}`}
                className="relative flex w-28 shrink-0 flex-col items-center text-center"
              >
                <div className="relative z-10 h-4 w-4 rounded-full border-[3px] border-white bg-[#2554A8] ring-1 ring-[#2554A8]" />
                <div className="mt-2.5 text-[13px] font-medium text-stone-900">{m.name}</div>
                <div className="mt-0.5 text-[12px] text-stone-500">
                  {new Date(m.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
