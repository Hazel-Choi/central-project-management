import Link from "next/link";
import { FolderOpen, Ticket as TicketIcon, TriangleAlert, MousePointerClick, Settings } from "lucide-react";
import { Tile } from "@/components/Tile";
import { StatusPill } from "@/components/StatusPill";
import { ProgressBar } from "@/components/ProgressBar";
import { Avatar } from "@/components/Avatar";
import { getPortfolioTiles, getProjectSummaries, getLastRefreshTime } from "@/lib/queries";

export const revalidate = 0;

export default async function PortfolioPage() {
  const [tiles, projects, lastRefresh] = await Promise.all([
    getPortfolioTiles(),
    getProjectSummaries(),
    getLastRefreshTime(),
  ]);

  const now = new Date();
  const timeLabel = lastRefresh.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-bold tracking-tight text-stone-900">
            Project portfolio
          </h1>
          <div className="mt-2 flex items-center gap-2 text-[15px] text-stone-500">
            <span aria-hidden>🕒</span>
            Last refreshed {timeLabel} · scheduled 8AM, 12PM, 6PM
          </div>
        </div>
        <Link
          href="/admin/timeline"
          className="flex items-center gap-1.5 rounded-full bg-[#DCE7FB] px-4 py-2 text-[14px] font-medium text-[#2554A8]"
        >
          <Settings size={15} />
          Admin Page
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-4 gap-4">
        <Tile icon={FolderOpen} label="Active projects" value={tiles.activeProjects} />
        <Tile icon={TicketIcon} label="Open tickets" value={tiles.openTickets} />
        <Tile
          icon={TriangleAlert}
          label="Blocked"
          value={tiles.blocked}
          valueClassName="text-[#B3392C]"
          highlight={tiles.blocked > 0}
        />
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-[14px] text-stone-500">
              <th className="px-6 pb-3 pt-5 font-normal">Project</th>
              <th className="px-6 pb-3 pt-5 font-normal">Status</th>
              <th className="px-6 pb-3 pt-5 font-normal">Timeline</th>
              <th className="px-6 pb-3 pt-5 font-normal">In Progress</th>
              <th className="px-6 pb-3 pt-5 font-normal">Ready</th>
              <th className="px-6 pb-3 pt-5 font-normal">Owner</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.projectId} className="border-t border-stone-100">
                <td className="px-6 py-5 align-top">
                  <Link
                    href={`/projects/${project.projectId}`}
                    className="block"
                  >
                    <div className="text-[16px] font-semibold text-stone-900">
                      {project.projectName}
                    </div>
                    {project.renewalLabel && (
                      <div className="mt-0.5 flex items-center gap-2 text-[14px] text-stone-500">
                        <span className="rounded-md bg-[#F6E7C8] px-2 py-0.5 text-[12px] font-medium text-[#8A5A0A]">
                          {project.renewalLabel}
                        </span>
                      </div>
                    )}
                  </Link>
                </td>
                <td className="px-6 py-5 align-top">
                  <StatusPill status={project.status} />
                </td>
                <td className="px-6 py-5 align-top">
                  {project.progressPercent != null ? (
                    <ProgressBar percent={project.progressPercent} status={project.status} overdue={project.isOverdue} />
                  ) : (
                    <span className="text-[14px] text-stone-400">No end date set</span>
                  )}
                </td>
                <td className="px-6 py-5 align-top text-[16px] text-stone-900">
                  {project.openTicketCount}
                </td>
                <td className="px-6 py-5 align-top text-[16px] text-stone-900">
                  {project.readyCount}
                </td>
                <td className="px-6 py-5 align-top">
                  <Avatar initials={project.ownerInitials} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center gap-2 text-[14px] text-stone-500">
        <MousePointerClick size={15} />
        Click any row to drill through to that project&apos;s tickets, documents and contract
      </div>
    </main>
  );
}
