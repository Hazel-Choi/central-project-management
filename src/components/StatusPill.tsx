import { ProjectStatus, TicketStatus } from "@/lib/types";

const STYLES: Record<string, string> = {
  "In progress": "bg-[#DCE7FB] text-[#2554A8]",
  "On track": "bg-[#E1EDD3] text-[#4C7A2E]",
  "At risk": "bg-[#F6DFAE] text-[#8A5A0A]",
  Done: "bg-[#CBEBE0] text-[#1F7A5C]",
  "To do": "bg-[#E7E5E1] text-[#57534E]",
  "In review": "bg-[#E3DDF6] text-[#5B3FA6]",
  Blocked: "bg-[#F7D8D3] text-[#B3392C]",
};

export function StatusPill({
  status,
}: {
  status: ProjectStatus | TicketStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] font-medium ${STYLES[status] ?? "bg-stone-200 text-stone-700"}`}
    >
      {status}
    </span>
  );
}
