const PALETTE: Record<string, string> = {
  HM: "bg-[#CFE0F7] text-[#2C5A9E]",
  DB: "bg-[#F5D3C4] text-[#B15A2E]",
  ZP: "bg-[#CDEBDD] text-[#227A5B]",
};

function colorFor(initials: string) {
  if (PALETTE[initials]) return PALETTE[initials];
  // stable fallback for any assignee not in the known palette
  const palette = Object.values(PALETTE);
  const idx = initials.charCodeAt(0) % palette.length;
  return palette[idx];
}

export function Avatar({ initials }: { initials: string }) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold ${colorFor(initials)}`}
    >
      {initials}
    </span>
  );
}
