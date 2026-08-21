"use client";

import { useEffect, useState } from "react";
import { getCurrentWeekPeriod } from "@/lib/period";


interface SprintRow {
  SprintId: number;
  SprintName: string;
  StartDate: string;
  EndDate: string;
}

interface PersonRow {
  personId: number;
  displayLabel: string;
}

interface OverrideRow {
  SprintCapacityOverrideId: number;
  PersonId: number;
  PersonName: string;
  OverrideDate: string;
  HoursOverride: number;
  Note: string | null;
}

function toDateInput(value: string): string {
  return value?.slice(0, 10) ?? "";
}

export default function CapacityOverrideSection({ projectCode }: { projectCode: string }) {
  const [sprints, setSprints] = useState<SprintRow[]>([]);
  const [sprintName, setSprintName] = useState<string>("");

  const [people, setPeople] = useState<PersonRow[]>([]);
  const [overrideItems, setOverrideItems] = useState<OverrideRow[]>([]);
  const [form, setForm] = useState({ personId: "", date: "", hours: "", note: "" });

  // Load sprints for this project (same source as CapacitySection)
  useEffect(() => {
    fetch(`/api/sprints?projectCode=${projectCode}`)
      .then((res) => res.json())
      .then((data: SprintRow[]) => {
        const week = getCurrentWeekPeriod();
        const weekOption: SprintRow = {
          SprintId: -1,
          SprintName: week.iterationOrSprint,
          StartDate: week.startDate,
          EndDate: week.endDate,
        };
        const combined = [...data, weekOption];
        setSprints(combined);

      // Prefer whichever sprint actually covers today, if one exists —
      // matches the SQL view's own priority (Sprint wins over Week when both apply)
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const activeSprint = data.find(
          (s) => toDateInput(s.StartDate) <= today && today <= toDateInput(s.EndDate)
        );
        setSprintName(activeSprint ? activeSprint.SprintName : week.iterationOrSprint);
      })
      .catch((err) => console.error(err));
  }, [projectCode]);

  // Load people assigned to this project, once
  useEffect(() => {
    fetch(`/api/project-people?projectCode=${projectCode}`)
      .then((res) => res.json())
      .then((data: PersonRow[]) => setPeople(data))
      .catch((err) => console.error(err));
  }, [projectCode]);

  // Load overrides for the selected sprint
  useEffect(() => {
    if (!sprintName) return;
    loadOverrides();
  }, [projectCode, sprintName]);

  async function loadOverrides() {
    const res = await fetch(
      `/api/capacity-override?projectCode=${projectCode}&iterationOrSprint=${encodeURIComponent(sprintName)}`
    );
    setOverrideItems(await res.json());
  }

  const currentSprint = sprints.find((s) => s.SprintName === sprintName);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/capacity-override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectCode,
        iterationOrSprint: sprintName,
        personId: parseInt(form.personId, 10),
        overrideDate: form.date,
        hoursOverride: parseFloat(form.hours),
        note: form.note || null,
      }),
    });
    setForm({ personId: "", date: "", hours: "", note: "" });
    loadOverrides();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/capacity-override/${id}`, { method: "DELETE" });
    loadOverrides();
  }

  return (
    <section className="mt-8">
      <h2 className="text-[18px] font-semibold text-stone-900">Capacity overrides</h2>

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
          <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-2xl bg-white p-5">
            <p className="text-[13px] text-stone-500">
              Override a specific person&apos;s hours for a single day — e.g. a half-day for a
              client meeting. Leave a day unset and it falls back to their normal weekday pattern.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <select
                className="w-full rounded-md border border-stone-200 px-3 py-2 text-[14px]"
                value={form.personId}
                onChange={(e) => setForm({ ...form, personId: e.target.value })}
                required
              >
                <option value="" disabled>Select person</option>
                {people.map((p) => (
                  <option key={p.personId} value={p.personId}>{p.displayLabel}</option>
                ))}
              </select>

              <input
                type="date"
                className="w-full rounded-md border border-stone-200 px-3 py-2 text-[14px]"
                value={form.date}
                min={currentSprint ? toDateInput(currentSprint.StartDate) : undefined}
                max={currentSprint ? toDateInput(currentSprint.EndDate) : undefined}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="Hours for that day"
                className="w-full rounded-md border border-stone-200 px-3 py-2 text-[14px]"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Note (optional)"
                className="w-full rounded-md border border-stone-200 px-3 py-2 text-[14px]"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <button className="rounded-md bg-[#2554A8] px-4 py-2 text-[14px] font-medium text-white">
              Save override
            </button>
          </form>

          <div className="mt-3 space-y-2">
            {overrideItems.map((o) => (
              <div key={o.SprintCapacityOverrideId} className="flex items-center justify-between rounded-xl bg-white px-5 py-3">
                <div>
                  <div className="text-[14px] font-medium text-stone-900">
                    {o.PersonName} — {o.HoursOverride}h on {toDateInput(o.OverrideDate)}
                  </div>
                  {o.Note && <div className="text-[12px] text-stone-500">{o.Note}</div>}
                </div>
                <button onClick={() => handleDelete(o.SprintCapacityOverrideId)} className="text-[13px] text-[#C4453A]">
                  Delete
                </button>
              </div>
            ))}
            {overrideItems.length === 0 && (
              <p className="text-[13px] text-stone-400">No overrides for this sprint.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
