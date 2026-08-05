"use client";

import { useEffect, useState } from "react";

interface SprintRow {
  SprintId: number;
  SprintName: string;
  StartDate: string;
  EndDate: string;
}

interface CapacityRow {
  SprintCapacityId: number;
  ExternalCapacityHoursPerDay: number;
  ExternalTeamSize: number | null;
  EffectiveDate: string;
}

interface AdjustmentRow {
  SprintCapacityAdjustmentId: number;
  AdjustmentDate: string;
  HoursDelta: number;
  Note: string | null;
}

function toDateInput(value: string): string {
  return value?.slice(0, 10) ?? "";
}

export default function CapacitySection({ projectCode }: { projectCode: string }) {
  const [sprints, setSprints] = useState<SprintRow[]>([]);
  const [sprintName, setSprintName] = useState<string>("");

  const [capacityItems, setCapacityItems] = useState<CapacityRow[]>([]);
  const [capacityForm, setCapacityForm] = useState({ hoursPerDay: "", teamSize: "" });

  const [adjustmentItems, setAdjustmentItems] = useState<AdjustmentRow[]>([]);
  const [adjustmentForm, setAdjustmentForm] = useState({ date: "", hoursDelta: "", note: "" });

  // Load sprints for this project
  useEffect(() => {
    fetch(`/api/sprints?projectCode=${projectCode}`)
      .then((res) => res.json())
      .then((data: SprintRow[]) => {
        setSprints(data);
        if (data.length > 0) setSprintName(data[0].SprintName);
      })
      .catch((err) => console.error(err));
  }, [projectCode]);

  // Load capacity + adjustments for the selected sprint, and autofill from prior sprint if empty
  useEffect(() => {
    if (!sprintName) return;
    loadCapacity();
    loadAdjustments();
  }, [projectCode, sprintName]);

  async function loadCapacity() {
    const res = await fetch(
      `/api/capacity?projectCode=${projectCode}&iterationOrSprint=${encodeURIComponent(sprintName)}`
    );
    const data: CapacityRow[] = await res.json();
    setCapacityItems(data);

    if (data.length > 0) {
      setCapacityForm({
        hoursPerDay: String(data[0].ExternalCapacityHoursPerDay),
        teamSize: data[0].ExternalTeamSize != null ? String(data[0].ExternalTeamSize) : "",
      });
    } else {
      // No entry for this sprint yet — autofill from the project's most recent sprint instead
      const latestRes = await fetch(`/api/capacity/latest?projectCode=${projectCode}`);
      const latest = await latestRes.json();
      setCapacityForm({
        hoursPerDay: latest ? String(latest.ExternalCapacityHoursPerDay) : "",
        teamSize: latest?.ExternalTeamSize != null ? String(latest.ExternalTeamSize) : "",
      });
    }
  }

  async function loadAdjustments() {
    const res = await fetch(
      `/api/capacity-adjustment?projectCode=${projectCode}&iterationOrSprint=${encodeURIComponent(sprintName)}`
    );
    setAdjustmentItems(await res.json());
  }

  async function handleCapacitySubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/capacity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectCode,
        iterationOrSprint: sprintName,
        externalCapacityHoursPerDay: parseFloat(capacityForm.hoursPerDay),
        externalTeamSize: capacityForm.teamSize ? parseInt(capacityForm.teamSize, 10) : null,
      }),
    });
    loadCapacity();
  }

  async function handleCapacityDelete(id: number) {
    await fetch(`/api/capacity/${id}`, { method: "DELETE" });
    loadCapacity();
  }

  async function handleAdjustmentSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/capacity-adjustment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectCode,
        iterationOrSprint: sprintName,
        adjustmentDate: adjustmentForm.date,
        hoursDelta: parseFloat(adjustmentForm.hoursDelta),
        note: adjustmentForm.note || null,
      }),
    });
    setAdjustmentForm({ date: "", hoursDelta: "", note: "" });
    loadAdjustments();
  }

  async function handleAdjustmentDelete(id: number) {
    await fetch(`/api/capacity-adjustment/${id}`, { method: "DELETE" });
    loadAdjustments();
  }

  return (
    <section className="mt-8">
      <h2 className="text-[18px] font-semibold text-stone-900">Capacity</h2>

      <select
        value={sprintName}
        onChange={(e) => setSprintName(e.target.value)}
        className="mt-3 rounded-md border border-stone-200 px-3 py-2 text-[14px]"
      >
        {sprints.map((s) => (
          <option key={s.SprintId} value={s.SprintName}>{s.SprintName}</option>
        ))}
      </select>

      {sprintName && (
        <>
          {/* External capacity entry */}
          <form onSubmit={handleCapacitySubmit} className="mt-3 space-y-2 rounded-2xl bg-white p-5">
            <p className="text-[13px] text-stone-500">
              Internal capacity is computed automatically. Enter external (non-internal) team members here.
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.5"
                placeholder="External hours/day"
                className="w-full rounded-md border border-stone-200 px-3 py-2 text-[14px]"
                value={capacityForm.hoursPerDay}
                onChange={(e) => setCapacityForm({ ...capacityForm, hoursPerDay: e.target.value })}
                required
              />
              <input
                type="number"
                step="1"
                placeholder="External team size"
                className="w-full rounded-md border border-stone-200 px-3 py-2 text-[14px]"
                value={capacityForm.teamSize}
                onChange={(e) => setCapacityForm({ ...capacityForm, teamSize: e.target.value })}
              />
            </div>
            <button className="rounded-md bg-[#2554A8] px-4 py-2 text-[14px] font-medium text-white">
              Save capacity
            </button>
          </form>

          <div className="mt-3 space-y-2">
            {capacityItems.map((c) => (
              <div key={c.SprintCapacityId} className="flex items-center justify-between rounded-xl bg-white px-5 py-3">
                <div>
                  <div className="text-[14px] font-medium text-stone-900">
                    {c.ExternalCapacityHoursPerDay} hrs/day
                    {c.ExternalTeamSize != null && ` · ${c.ExternalTeamSize} people`}
                  </div>
                  <div className="text-[12px] text-stone-500">Effective {toDateInput(c.EffectiveDate)}</div>
                </div>
                <button onClick={() => handleCapacityDelete(c.SprintCapacityId)} className="text-[13px] text-[#C4453A]">
                  Delete
                </button>
              </div>
            ))}
          </div>

          {/* Adjustments — for unplanned external leave */}
          <form onSubmit={handleAdjustmentSubmit} className="mt-6 space-y-2 rounded-2xl bg-white p-5">
            <p className="text-[13px] text-stone-500">
              One-off correction — e.g. an external team member out unexpectedly.
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                className="w-full rounded-md border border-stone-200 px-3 py-2 text-[14px]"
                value={adjustmentForm.date}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, date: e.target.value })}
                required
              />
              <input
                type="number"
                step="0.5"
                placeholder="-8"
                className="w-full rounded-md border border-stone-200 px-3 py-2 text-[14px]"
                value={adjustmentForm.hoursDelta}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, hoursDelta: e.target.value })}
                required
              />
            </div>
            <input
              type="text"
              placeholder="Note (optional)"
              className="w-full rounded-md border border-stone-200 px-3 py-2 text-[14px]"
              value={adjustmentForm.note}
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, note: e.target.value })}
            />
            <button className="rounded-md bg-[#2554A8] px-4 py-2 text-[14px] font-medium text-white">
              Save adjustment
            </button>
          </form>

          <div className="mt-3 space-y-2">
            {adjustmentItems.map((a) => (
              <div key={a.SprintCapacityAdjustmentId} className="flex items-center justify-between rounded-xl bg-white px-5 py-3">
                <div>
                  <div className="text-[14px] font-medium text-stone-900">
                    {a.HoursDelta > 0 ? "+" : ""}{a.HoursDelta} hrs — {toDateInput(a.AdjustmentDate)}
                  </div>
                  {a.Note && <div className="text-[12px] text-stone-500">{a.Note}</div>}
                </div>
                <button onClick={() => handleAdjustmentDelete(a.SprintCapacityAdjustmentId)} className="text-[13px] text-[#C4453A]">
                  Delete
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
