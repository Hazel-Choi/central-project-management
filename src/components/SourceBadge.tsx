import { Source } from "@/lib/types";

const STYLES: Record<Source, string> = {
  DevOps: "bg-[#DCE7FB] text-[#2554A8]",
  Jira: "bg-[#E3DDF6] text-[#5B3FA6]",
};

export function SourceBadge({ source }: { source: Source }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-[13px] font-medium ${STYLES[source]}`}
    >
      {source}
    </span>
  );
}
