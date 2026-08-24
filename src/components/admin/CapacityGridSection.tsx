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

function getWeekdaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const cur = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  while (cur <= endDate) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(
        `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`
      );
    }
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export default function CapacityGridSection({ projectCode }: { projectCode: string }) {
  const [sprints, setSprints] = useState<SprintRow[]>([]);
  const [sprintName, setSprintName] = useState<string>("");
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [existing, setExisting] = useState<OverrideRow[]>([]);
  const [grid, setGrid] = useState<Record<string, string>>({}); // key: `${personId}_${date}` -> hours string
  const [saving, setSaving] = useState(false);

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

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const activeSprint = data.find(
          (s) => toDateInput(s.StartDate) <= today && today <= toDateInput(s.EndDate)
        );
        setSprintName(activeSprint ? activeSprint.SprintName : week.iterationOrSprint);
      })
      .catch((err) => console.error(err));
  }, [projectCode]);

  useEffect(() => {
    fetch(`/api/project-people?projectCode=${projectCode}`)
      .then((res) => res.json())
      .then((data: PersonRow[]) => setPeople(data))
      .catch((err) => console.error(err));
  }, [projectCode]);

  useEffect(() => {
    if (!sprintName) return;
    loadOverrides();
  }, [projectCode, sprintName]);

  async function loadOverrides() {
    const res = await fetch(
      `/api/capacity-override?projectCode=${projectCode}&iterationOrSprint=${encodeURIComponent(sprintName)}`
    );
    const rows: OverrideRow[] = await res.json();
    setExisting(rows);
    const next: Record<string, string> = {};
    for (const r of rows) {
      next[`${r.PersonId}_${toDateInput(r.OverrideDate)}`] = String(r.HoursOverride);
    }
    setGrid(next);
  }

  const currentSprint = sprints.find((s) => s.SprintName === sprintName);
  const days = currentSprint ? getWeekdaysInRange(toDateInput(currentSprint.StartDate), toDateInput(currentSprint.EndDate)) : [];

  function handleCellChange(personId: number, date: string, value: string) {
    setGrid((prev) => ({ ...prev, [`${personId}_${date}`]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const existingByKey = new Map(existing.map((r) => [`${r.PersonId}_${toDateInput(r.OverrideDate)}`, r]));
      const upserts: { personId: number; overrideDate: string; hoursOverride: number }[] = [];
      const deletes: number[] = [];

      for (const p of people) {
        for (const d of days) {
          const key = `${p.personId}_${d}`;
          const rawValue = grid[key];
          const prior = existingByKey.get(key);

          if (rawValue === undefined || rawValue === "") {
            if (prior) deletes.push(prior.SprintCapacityOverrideId);
            continue;
          }
          const parsed = parseFloat(rawValue);
          if (Number.isNaN(parsed)) continue;
          if (prior && parsed === prior.HoursOverride) continue; // unchanged

          upserts.push({ personId: p.personId, overrideDate: d, hoursOverride: parsed });
        }
      }

      if (upserts.length > 0) {
        await fetch("/api/capacity-override/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectCode, iterationOrSprint: sprintName, entries: upserts }),
        });
      }

      for (const id of deletes) {
        await fetch(`/api/capacity-override/${id}`, { method: "DELETE" });
      }

      await loadOverrides();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-[18px] font-semibold text-stone-900">Capacity grid</h2>

      {sprints.length > 0 ? (
        <select
          value={sprintName}
          onChange={(e) => setSprintName(e.target.value)}
          className="mt-3 rounded-md border border-stone-200 px-3 py-2 text-[14px]"
        >
          {sprints.map((s) => (
            <option key={s.SprintId} value={s.SprintName}>{s.SprintName}</option>
          ))}
        </select>
      ) : (
        <p className="mt-3 text-[13px] text-stone-400">Loading sprints…</p>
      )}

      <div className="mt-3 overflow-x-auto rounded-2xl bg-white p-5">
        {people.length === 0 ? (
          <p className="text-[13px] text-stone-400">No people found for this project yet.</p>
        ) : (
          <>
            <table className="min-w-full text-[13px]">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white px-3 py-2 text-left font-medium text-stone-500">Person</th>
                  {days.map((d) => (
                    <th key={d} className="px-2 py-2 text-center font-medium text-stone-500">
                      {d.slice(5)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.personId} className="border-t border-stone-100">
                    <td className="sticky left-0 bg-white px-3 py-2 font-medium text-stone-900">{p.displayLabel}</td>
                    {days.map((d) => (
                      <td key={d} className="px-2 py-1 text-center">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          className="w-16 rounded-md border border-stone-200 px-2 py-1 text-center text-[13px]"
                          value={grid[`${p.personId}_${d}`] ?? ""}
                          onChange={(e) => handleCellChange(p.personId, d, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-4 rounded-md bg-[#2554A8] px-4 py-2 text-[14px] font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save grid"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
