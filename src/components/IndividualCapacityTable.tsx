import { IndividualCapacityReport, IndividualCapacityRow } from "@/lib/types";

const RAG_STYLES: Record<string, string> = {
  Red: "bg-red-50 text-red-700 border-red-200",
  Amber: "bg-amber-50 text-amber-700 border-amber-200",
  Green: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const RAG_LABELS: Record<string, string> = {
  Red: "Over capacity",
  Amber: "Capacity full",
  Green: "Within capacity",
};

function RagBadge({ status }: { status: IndividualCapacityRow["ragStatus"] }) {
  if (!status) return <span className="text-[13px] text-stone-400">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${RAG_STYLES[status]}`}
    >
      {RAG_LABELS[status]}
    </span>
  );
}

function formatHours(hours: number): string {
  const sign = hours > 0 ? "+" : "";
  return `${sign}${hours.toFixed(1)}h`;
}

export function IndividualCapacityTable({ report }: { report: IndividualCapacityReport }) {
  const { rows, teamTotalCapacityHours, teamTotalRemainingWorkHours, iterationOrSprint, periodType } = report;

  const assignedRows = rows.filter((r) => r.personId != null);
  const unassignedRow = rows.find((r) => r.personId == null);

  return (
    <div className="rounded-2xl bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[18px] font-semibold text-stone-900">Individual capacity</h2>
        <span className="text-[13px] text-stone-500">
          {iterationOrSprint ?? "No active period"}
          {periodType === "Week" && " (no sprint configured — showing current week)"}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-[14px] text-stone-400">No capacity or work data available for this project.</p>
      ) : (
        <>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-stone-200 text-left text-[12px] uppercase tracking-wide text-stone-500">
                <th className="py-2 font-medium">Person</th>
                <th className="py-2 font-medium text-right">Remaining capacity</th>
                <th className="py-2 font-medium text-right">Remaining work</th>
                <th className="py-2 font-medium text-right">Delta</th>
                <th className="py-2 font-medium text-right">Open items</th>
                <th className="py-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {assignedRows.map((row) => (
                <tr key={row.personId} className="border-b border-stone-100">
                  <td className="py-2.5">
                    <span className="font-medium text-stone-900">{row.personInitials}</span>
                  </td>
                  <td className="py-2.5 text-right text-stone-700">{row.remainingCapacityHours.toFixed(1)}h</td>
                  <td className="py-2.5 text-right text-stone-700">{row.remainingWorkHours.toFixed(1)}h</td>
                  <td className={`py-2.5 text-right font-medium ${row.capacityDeltaHours < 0 ? "text-red-600" : "text-stone-700"}`}>
                    {formatHours(row.capacityDeltaHours)}
                  </td>
                  <td className="py-2.5 text-right text-stone-500">{row.openItemCount}</td>
                  <td className="py-2.5 text-right"><RagBadge status={row.ragStatus} /></td>
                </tr>
              ))}

              {unassignedRow && (
                <tr className="border-b border-stone-100 italic text-stone-400">
                  <td className="py-2.5">Unassigned</td>
                  <td className="py-2.5 text-right">—</td>
                  <td className="py-2.5 text-right">{unassignedRow.remainingWorkHours.toFixed(1)}h</td>
                  <td className="py-2.5 text-right">—</td>
                  <td className="py-2.5 text-right">{unassignedRow.openItemCount}</td>
                  <td className="py-2.5 text-right">—</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="text-[14px] font-semibold text-stone-900">
                <td className="pt-3">Team total</td>
                <td className="pt-3 text-right">{teamTotalCapacityHours.toFixed(1)}h</td>
                <td className="pt-3 text-right">{teamTotalRemainingWorkHours.toFixed(1)}h</td>
                <td className={`pt-3 text-right ${teamTotalCapacityHours - teamTotalRemainingWorkHours < 0 ? "text-red-600" : ""}`}>
                  {formatHours(teamTotalCapacityHours - teamTotalRemainingWorkHours)}
                </td>
                <td className="pt-3"></td>
                <td className="pt-3"></td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  );
}
