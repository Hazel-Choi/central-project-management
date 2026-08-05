"use client";

import { useEffect, useState } from "react";
import CapacitySection from "@/components/admin/CapacitySection";

// Hardcoded until there's a /api/projects endpoint reading core.Project directly —
// add new ProjectCodes here as clients get onboarded, or replace with a real fetch later.
interface ProjectOption {
  code: string;
  name: string;
}
interface MilestoneRow {
  MilestoneId: number;
  Title: string;
  Description: string | null;
  MilestoneDate: string;
}

interface SprintRow {
  SprintId: number;
  SprintName: string;
  StartDate: string;
  EndDate: string;
}


function toDateInput(value: string): string {
  return value?.slice(0, 10) ?? "";
}

export default function TimelineAdminPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectCode, setProjectCode] = useState<string>("");

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load projects (${res.status})`);
        return res.json();
      })
      .then((data: ProjectOption[]) => {
        setProjects(data);
        if (data.length > 0) setProjectCode(data[0].code);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="text-[26px] font-bold text-stone-900">Admin page</h1>

      <select
        value={projectCode}
        onChange={(e) => setProjectCode(e.target.value)}
        className="mt-4 rounded-md border border-stone-200 px-3 py-2 text-[14px]"
      >
        {projects.map((p) => (
          <option key={p.code} value={p.code}>{p.name}</option>
        ))}
      </select>

      {projectCode && (
        <>
          <MilestonesSection projectCode={projectCode} />
          <SprintsSection projectCode={projectCode} />
          <CapacitySection projectCode={projectCode} />
        </>
      )}
    </main>
  );
}

function MilestonesSection({ projectCode }: { projectCode: string }) {
  const [items, setItems] = useState<MilestoneRow[]>([]);
  const [form, setForm] = useState({ title: "", description: "", date: "" });
  const [editingId, setEditingId] = useState<number | null>(null);

  async function load() {
    const res = await fetch(`/api/milestones?projectCode=${projectCode}`);
    setItems(await res.json());
  }

  useEffect(() => { load(); }, [projectCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId !== null) {
      await fetch(`/api/milestones/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectCode, ...form }),
      });
    }
    setForm({ title: "", description: "", date: "" });
    setEditingId(null);
    load();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/milestones/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(m: MilestoneRow) {
    setEditingId(m.MilestoneId);
    setForm({ title: m.Title, description: m.Description ?? "", date: toDateInput(m.MilestoneDate) });
  }

  return (
    <section className="mt-8">
      <h2 className="text-[18px] font-semibold text-stone-900">Milestones</h2>
      <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-2xl bg-white p-5">
        <input
          className="w-full rounded-md border border-stone-200 px-3 py-2 text-[14px]"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <textarea
          className="w-full rounded-md border border-stone-200 px-3 py-2 text-[14px]"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          type="date"
          className="w-full rounded-md border border-stone-200 px-3 py-2 text-[14px]"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
        <div className="flex gap-2">
          <button className="rounded-md bg-[#2554A8] px-4 py-2 text-[14px] font-medium text-white">
            {editingId !== null ? "Update" : "Add milestone"}
          </button>
          {editingId !== null && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setForm({ title: "", description: "", date: "" }); }}
              className="rounded-md bg-stone-200 px-4 py-2 text-[14px] font-medium text-stone-700"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-3 space-y-2">
        {items.map((m) => (
          <div key={m.MilestoneId} className="flex items-center justify-between rounded-xl bg-white px-5 py-3">
            <div>
              <div className="text-[14px] font-medium text-stone-900">{m.Title}</div>
              <div className="text-[12px] text-stone-500">{toDateInput(m.MilestoneDate)}</div>
            </div>
            <div className="flex gap-3 text-[13px]">
              <button onClick={() => startEdit(m)} className="text-[#2554A8]">Edit</button>
              <button onClick={() => handleDelete(m.MilestoneId)} className="text-[#C4453A]">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SprintsSection({ projectCode }: { projectCode: string }) {
  const [items, setItems] = useState<SprintRow[]>([]);
  const [form, setForm] = useState({ sprintName: "", startDate: "", endDate: "" });
  const [editingId, setEditingId] = useState<number | null>(null);

  async function load() {
    const res = await fetch(`/api/sprints?projectCode=${projectCode}`);
    setItems(await res.json());
  }

  useEffect(() => { load(); }, [projectCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId !== null) {
      await fetch(`/api/sprints/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectCode, ...form }),
      });
    }
    setForm({ sprintName: "", startDate: "", endDate: "" });
    setEditingId(null);
    load();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/sprints/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(s: SprintRow) {
    setEditingId(s.SprintId);
    setForm({ sprintName: s.SprintName, startDate: toDateInput(s.StartDate), endDate: toDateInput(s.EndDate) });
  }

  return (
    <section className="mt-8">
      <h2 className="text-[18px] font-semibold text-stone-900">Sprints</h2>
      <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-2xl bg-white p-5">
        <input
          className="w-full rounded-md border border-stone-200 px-3 py-2 text-[14px]"
          placeholder="Sprint name (e.g. Sprint 24)"
          value={form.sprintName}
          onChange={(e) => setForm({ ...form, sprintName: e.target.value })}
          required
        />
        <div className="flex gap-2">
          <input
            type="date"
            className="w-full rounded-md border border-stone-200 px-3 py-2 text-[14px]"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            required
          />
          <input
            type="date"
            className="w-full rounded-md border border-stone-200 px-3 py-2 text-[14px]"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            required
          />
        </div>
        <div className="flex gap-2">
          <button className="rounded-md bg-[#2554A8] px-4 py-2 text-[14px] font-medium text-white">
            {editingId !== null ? "Update" : "Add sprint"}
          </button>
          {editingId !== null && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setForm({ sprintName: "", startDate: "", endDate: "" }); }}
              className="rounded-md bg-stone-200 px-4 py-2 text-[14px] font-medium text-stone-700"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-3 space-y-2">
        {items.map((s) => (
          <div key={s.SprintId} className="flex items-center justify-between rounded-xl bg-white px-5 py-3">
            <div>
              <div className="text-[14px] font-medium text-stone-900">{s.SprintName}</div>
              <div className="text-[12px] text-stone-500">{toDateInput(s.StartDate)} – {toDateInput(s.EndDate)}</div>
            </div>
            <div className="flex gap-3 text-[13px]">
              <button onClick={() => startEdit(s)} className="text-[#2554A8]">Edit</button>
              <button onClick={() => handleDelete(s.SprintId)} className="text-[#C4453A]">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

