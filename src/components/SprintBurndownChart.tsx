"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { SprintBurndown } from "@/types";

export function SprintBurndownChart({ data }: { data: SprintBurndown }) {
  const merged = data.actual.map((a, i) => ({
    date: a.date,
    actual: a.remaining,
    ideal: data.ideal[i]?.remaining ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={merged}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis label={{ value: "Remaining effort", angle: -90, position: "insideLeft" }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="4 4" name="Ideal" dot={false} />
        <Line type="monotone" dataKey="actual" stroke="#2563eb" name="Actual" />
      </LineChart>
    </ResponsiveContainer>
  );
}
