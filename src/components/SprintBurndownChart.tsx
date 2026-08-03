"use client";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { SprintHoursBurndown } from "@/lib/types";

export function SprintBurndownChart({ data }: { data: SprintHoursBurndown }) {
  const merged = data.actual.map((a, i) => ({
    dayLabel: a.dayLabel,
    remaining: a.remaining,
    ideal: data.ideal[i]?.remaining ?? null,
  }));

  const todayLabel = `Day ${data.currentDayIndex}`;
  const maxY = Math.max(...merged.map((m) => m.ideal ?? 0), ...merged.map((m) => m.remaining ?? 0));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-stone-600">
        <span className="font-medium text-stone-900">
          Day {data.currentDayIndex} of {data.totalWorkingDays}
        </span>
        <span>Avg burn: {data.avgHoursPerDay.toFixed(1)} hrs/day</span>
        <span>
          Projected completion: {data.projectedCompletionDate ?? "insufficient data yet"}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={merged}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="dayLabel" />
          <YAxis label={{ value: "Remaining hours", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="remaining"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.15}
            name="Remaining work"
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="#94a3b8"
            strokeDasharray="4 4"
            dot={false}
            name="Ideal"
          />
          <ReferenceLine x={todayLabel} stroke="#B3392C" strokeDasharray="2 2" label="Today" />
          {data.scopeChanges.map((sc) => {
            const dayLabel = merged.find((m) => m.remaining !== null)?.dayLabel;
            return (
              <ReferenceDot
                key={sc.ticketId}
                x={`Day ${data.actual.findIndex((a) => a.date === sc.date) + 1}`}
                y={maxY * 0.95}
                r={4}
                fill="#C4453A"
                stroke="none"
                label={{ value: `+${sc.effortDelta}h`, position: "top", fontSize: 11 }}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>

      {data.scopeChanges.length > 0 && (
        <div className="mt-2 text-[13px] text-stone-500">
          Scope added: {data.scopeChanges.map((sc) => `${sc.title} (+${sc.effortDelta}h)`).join(", ")}
        </div>
      )}
    </div>
  );
}
