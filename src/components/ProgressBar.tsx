import { ProjectStatus } from "@/lib/types";

const BAR_COLOR: Record<ProjectStatus, string> = {
  "In progress": "bg-[#4A7FD6]",
  "On track": "bg-[#6FA84A]",
  "At risk": "bg-[#D08A1E]",
  Done: "bg-[#2A9D7C]",
};

export function ProgressBar({
  percent,
  status,
  width = 130,
}: {
  percent: number;
  status: ProjectStatus;
  width?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[15px] font-semibold text-stone-900">
        {percent}%
      </span>
      <div
        className="h-[6px] rounded-full bg-stone-200"
        style={{ width }}
      >
        <div
          className={`h-full rounded-full ${BAR_COLOR[status]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
