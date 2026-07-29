import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Clock } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { Avatar } from "@/components/Avatar";
import { getProjectDetail } from "@/lib/queries";
import { TicketStatus } from "@/lib/types";
import { ProjectTimeline } from "@/components/MilestoneTimeline";

export const revalidate = 0;

const STATUS_BAR_COLOR: Record<TicketStatus, string> = {
  "To do": "bg-stone-300",
  "In progress": "bg-[#4A7FD6]",
  "In review": "bg-[#8A6FD6]",
  Blocked: "bg-[#C4453A]",
  Done: "bg-[#2A9D7C]",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectDetail(id);
  if (!project) notFound();

  const breakdown = project.statusBreakdown;
  const total =
    breakdown.toDo +
    breakdown.inProgress +
    breakdown.inReview +
    breakdown.blocked +
    breakdown.done || 1;

  const segments: { label: string; count: number; status: TicketStatus }[] = [
    { label: "To do", count: breakdown.toDo, status: "To do" },
    { label: "In progress", count: breakdown.inProgress, status: "In progress" },
    { label: "In review", count: breakdown.inReview, status: "In review" },
    { label: "Blocked", count: breakdown.blocked, status: "Blocked" },
    { label: "Done", count: breakdown.done, status: "Done" },
  ];

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-[14px] font-medium text-[#2554A8]"
      >
        <ArrowLeft size={14} />
        Portfolio
        <span className="text-stone-400 font-normal">/ {project.projectName}</span>
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[30px] font-bold tracking-tight text-stone-900">
              {project.projectName}
            </h1>
            <StatusPill status={project.status} />
          </div>
          <div className="mt-1 text-[15px] text-stone-500">
            {project.clientName} · owner {project.ownerName}
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center rounded-full bg-[#DCE7FB] px-3 py-1 text-[13px] font-medium text-[#2554A8]">
            Azure DevOps
          </span>
          <div className="mt-2 flex items-center justify-end gap-1.5 text-[14px] text-stone-500">
            <Clock size={14} />
            Refreshed{" "}
            {new Date().toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-4 gap-4">
        <StatTile label="Progress" value={`${project.progressPercent}%`} />
        <StatTile label="Open tickets" value={project.openTicketCount} />
        <StatTile
          label="Blocked"
          value={project.blockedCount}
          valueClassName="text-[#B3392C]"
        />
        <StatTile label="Closed (30d)" value={project.closedLast30d} />
      </div>

      <div className="mt-6 rounded-2xl bg-white px-6 py-5">
        <div className="text-[14px] text-stone-500">Tickets by status</div>
        <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full">
          {segments.map((s) => (
            <div
              key={s.label}
              className={STATUS_BAR_COLOR[s.status]}
              style={{ width: `${(s.count / total) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-stone-600">
          {segments.map((s) => (
            <span key={s.label} className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${STATUS_BAR_COLOR[s.status]}`}
              />
              {s.label} {s.count}
            </span>
          ))}
        </div>
      </div>

      <ProjectTimeline
        milestones={project.milestones}
        sprints={project.sprints}
        holidays={project.holidays}
      />

      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-[22px] font-bold text-stone-900">Tickets</h2>
          {project.currentSprintName ? (
            <span className="inline-flex items-center rounded-full bg-[#EFE9FB] px-3 py-1 text-[13px] font-medium text-[#5B3FA8]">
              {project.currentSprintName}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-stone-200 px-3 py-1 text-[13px] font-medium text-stone-600">
              Board view
            </span>
          )}
        </div>
        <span className="text-[14px] text-stone-500">
          {project.currentSprintName
            ? `${project.tickets.length} in this sprint`
            : `Showing ${project.tickets.length} of ${project.totalTicketCount}`}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-white">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-[14px] text-stone-500">
              <th className="px-6 pb-3 pt-5 font-normal">ID</th>
              <th className="px-6 pb-3 pt-5 font-normal">Title</th>
              <th className="px-6 pb-3 pt-5 font-normal">Status</th>
              {!project.currentSprintName && (
                <th className="px-6 pb-3 pt-5 font-normal">Sprint</th>
              )}
              <th className="px-6 pb-3 pt-5 font-normal">Assignee</th>
              <th className="px-6 pb-3 pt-5 font-normal">Updated</th>
              <th className="px-6 pb-3 pt-5 font-normal" />
            </tr>
          </thead>
          <tbody>
            {project.tickets.map((ticket) => (
              <tr key={ticket.id} className="border-t border-stone-100">
                <td className="px-6 py-5 align-top text-[15px] text-stone-500">
                  {ticket.id}
                </td>
                <td className="px-6 py-5 align-top">
                  <span className="flex items-start gap-2 text-[15px] font-medium text-stone-900">
                    {ticket.flagged && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C4453A]" />
                    )}
                    {ticket.title}
                  </span>
                </td>
                <td className="px-6 py-5 align-top">
                  <StatusPill status={ticket.status} />
                </td>
                {!project.currentSprintName && (
                  <td className="px-6 py-5 align-top text-[15px] text-stone-500">
                    {ticket.sprintName ?? "—"}
                  </td>
                )}
                <td className="px-6 py-5 align-top">
                  <Avatar initials={ticket.assigneeInitials} />
                </td>
                <td className="px-6 py-5 align-top text-[15px] text-stone-500">
                  {ticket.updatedLabel}
                </td>
                <td className="px-6 py-5 align-top">
                  <a href={ticket.url} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} className="text-stone-400" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function StatTile({
  label,
  value,
  valueClassName = "text-stone-900",
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl bg-[#F0EEE8] px-6 py-5">
      <div className="text-[15px] text-stone-500">{label}</div>
      <div className={`mt-3 text-3xl font-semibold ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}
