import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { getProjectDetail, getIndividualCapacityReport } from "@/lib/queries";
import { ProjectTimeline } from "@/components/MilestoneTimeline";
import { SprintBurndownChart } from "@/components/SprintBurndownChart";
import { TicketsTable } from "@/components/TicketsTable";
import { IndividualCapacityTable } from "@/components/IndividualCapacityTable";

export const revalidate = 0;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectDetail(id);
  if (!project) notFound();

  const capacityReport = await getIndividualCapacityReport(id);

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
            Owner {project.ownerName}
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

      <ProjectTimeline
        milestones={project.milestones}
        sprints={project.sprints}
        holidays={project.holidays}
      />

      {project.sprintBurndown && (
        <div className="mt-8 rounded-2xl bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <h2 className="text-[22px] font-bold text-stone-900">Sprint burndown</h2>
            <span className="inline-flex items-center rounded-full bg-[#EFE9FB] px-3 py-1 text-[13px] font-medium text-[#5B3FA8]">
              {project.sprintBurndown.sprint.name}
            </span>
          </div>
          <div className="mt-4">
            <SprintBurndownChart data={project.sprintBurndown} />
          </div>
        </div>
      )}

      <div className="mt-8">
        <IndividualCapacityTable report={capacityReport} />
      </div>

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

      <TicketsTable tickets={project.tickets} />
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
