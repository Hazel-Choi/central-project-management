"use client";

import { Fragment, useState } from "react";
import { ExternalLink, Clock, ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { Avatar } from "@/components/Avatar";
import { Ticket } from "@/lib/types";

export function TicketsTable({ tickets }: { tickets: Ticket[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl bg-white">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="text-[14px] text-stone-500">
            <th className="w-20 px-6 pb-3 pt-5 font-normal">ID</th>
            <th className="px-6 pb-3 pt-5 font-normal">Title</th>
            <th className="w-32 px-6 pb-3 pt-5 font-normal">Status</th>
            <th className="px-6 pb-3 pt-5 font-normal">Assignee</th>
            <th className="px-6 pb-3 pt-5 font-normal">Updated</th>
            <th className="px-6 pb-3 pt-5 font-normal" />
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => {
            const hasChildTasks = (ticket.childTasks?.length ?? 0) > 0;
            const isExpanded = expandedId === ticket.id;

            return (
              <Fragment key={ticket.id}>
                <tr className="border-t border-stone-100">
                  <td className="w-20 px-6 py-5 align-top text-[15px] text-stone-500 whitespace-nowrap">
                    {ticket.id}
                  </td>
                  <td className="px-6 py-5 align-top">
                    <span
                      className={`flex items-start gap-2 text-[15px] font-medium text-stone-900 ${
                        ticket.timeFlag && hasChildTasks ? "cursor-pointer" : ""
                      }`}
                      onClick={() => {
                        if (!ticket.timeFlag || !hasChildTasks) return;
                        setExpandedId(isExpanded ? null : ticket.id);
                      }}
                    >
                      {ticket.flagged && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C4453A]" />
                      )}
                      {ticket.timeFlag && hasChildTasks && (
                        <ChevronRight
                          size={14}
                          className={`mt-1 shrink-0 text-stone-400 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      )}
                      {ticket.title}
                      {ticket.timeFlag && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FBEAD2] px-2 py-0.5 text-[12px] font-medium text-[#9A5B00]">
                          <Clock size={11} />
                          {Math.round((ticket.percentConsumed ?? 0) * 100)}%
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <StatusPill status={ticket.status} />
                  </td>
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
                {isExpanded && ticket.childTasks && (
                  <tr key={`${ticket.id}-drilldown`} className="bg-[#FAF9F6]">
                    <td />
                    <td colSpan={5} className="px-6 pb-4 pt-1">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[12px] text-stone-400">
                            <th className="pb-1 pr-4 font-normal">Task</th>
                            <th className="pb-1 pr-4 font-normal">Remaining / est.</th>
                            <th className="pb-1 font-normal" />
                          </tr>
                        </thead>
                        <tbody>
                          {ticket.childTasks.map((task) => (
                            <tr key={task.id} className="text-[13px]">
                              <td className="py-1 pr-4 text-stone-700">{task.title}</td>
                              <td className="py-1 pr-4 text-stone-500">
                                {task.remainingWorkHours}h / {task.originalEstimateHours}h
                              </td>
                              <td className="py-1">
                                {task.percentConsumed != null && (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                      task.percentConsumed >= 1
                                        ? "bg-[#FBE1DE] text-[#B3392C]"
                                        : task.percentConsumed >= 0.5
                                        ? "bg-[#FBEAD2] text-[#9A5B00]"
                                        : "text-stone-400"
                                    }`}
                                  >
                                    {Math.round(task.percentConsumed * 100)}%
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
