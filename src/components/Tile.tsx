import { LucideIcon } from "lucide-react";

export function Tile({
  icon: Icon,
  label,
  value,
  valueClassName = "text-stone-900",
  highlight = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  valueClassName?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl px-6 py-5 ${
        highlight
          ? "bg-[#C4453A]/10 ring-1 ring-inset ring-[#C4453A]/20"
          : "bg-[#F0EEE8]"
      }`}
    >
      <div className="flex items-center gap-2 text-[15px] text-stone-500">
        <Icon size={17} strokeWidth={2} />
        {label}
      </div>
      <div className={`mt-3 text-3xl font-semibold ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}
