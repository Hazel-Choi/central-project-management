'use client';

import { useState, useEffect } from 'react';

interface CapacityFormProps {
  projectCode: string;
  iterationOrSprint: string;
}

export default function CapacityForm({ projectCode, iterationOrSprint }: CapacityFormProps) {
  const [externalCapacityHoursPerDay, setExternalCapacityHoursPerDay] = useState('');
  const [externalTeamSize, setExternalTeamSize] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  // Adjustment sub-form state
  const [adjustmentDate, setAdjustmentDate] = useState('');
  const [hoursDelta, setHoursDelta] = useState('');
  const [note, setNote] = useState('');
  const [adjustmentSubmitting, setAdjustmentSubmitting] = useState(false);
  const [adjustmentMessage, setAdjustmentMessage] = useState<string | null>(null);

  // Autofill from the project's most recent capacity entry
  useEffect(() => {
    if (!projectCode) return;

    fetch(`/api/admin/capacity?projectCode=${encodeURIComponent(projectCode)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setExternalCapacityHoursPerDay(String(data.ExternalCapacityHoursPerDay ?? ''));
          setExternalTeamSize(data.ExternalTeamSize != null ? String(data.ExternalTeamSize) : '');
        } else {
          setExternalCapacityHoursPerDay('');
          setExternalTeamSize('');
        }
      })
      .catch(() => {
        // Silently ignore — autofill is a convenience, not a required step
      });
  }, [projectCode]);

  async function handleSubmitCapacity(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const res = await fetch('/api/admin/capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectCode,
          iterationOrSprint,
          externalCapacityHoursPerDay: parseFloat(externalCapacityHoursPerDay),
          externalTeamSize: externalTeamSize ? parseInt(externalTeamSize, 10) : null,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');
      setSubmitMessage('Capacity saved.');
    } catch {
      setSubmitMessage('Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitAdjustment(e: React.FormEvent) {
    e.preventDefault();
    setAdjustmentSubmitting(true);
    setAdjustmentMessage(null);

    try {
      const res = await fetch('/api/admin/capacity-adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectCode,
          iterationOrSprint,
          adjustmentDate,
          hoursDelta: parseFloat(hoursDelta),
          note: note || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');
      setAdjustmentMessage('Adjustment saved.');
      setAdjustmentDate('');
      setHoursDelta('');
      setNote('');
    } catch {
      setAdjustmentMessage('Something went wrong — please try again.');
    } finally {
      setAdjustmentSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* External capacity entry */}
      <form onSubmit={handleSubmitCapacity} className="space-y-4 rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900">External capacity</h3>
        <p className="text-sm text-gray-500">
          Internal capacity is computed automatically from project assignments. Enter external
          (non-internal) team members&apos; capacity here.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Hours per day</label>
            <input
              type="number"
              step="0.5"
              value={externalCapacityHoursPerDay}
              onChange={(e) => setExternalCapacityHoursPerDay(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Team size (external)</label>
            <input
              type="number"
              step="1"
              value={externalTeamSize}
              onChange={(e) => setExternalTeamSize(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save capacity'}
        </button>

        {submitMessage && <p className="text-sm text-gray-600">{submitMessage}</p>}
      </form>

      {/* Adjustment entry — for unplanned external leave/changes */}
      <form onSubmit={handleSubmitAdjustment} className="space-y-4 rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900">Capacity adjustment</h3>
        <p className="text-sm text-gray-500">
          One-off correction — e.g. an external team member out unexpectedly. Rarely needed.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={adjustmentDate}
              onChange={(e) => setAdjustmentDate(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Hours delta</label>
            <input
              type="number"
              step="0.5"
              placeholder="-8"
              value={hoursDelta}
              onChange={(e) => setHoursDelta(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. external contractor out sick"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={adjustmentSubmitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {adjustmentSubmitting ? 'Saving…' : 'Save adjustment'}
        </button>

        {adjustmentMessage && <p className="text-sm text-gray-600">{adjustmentMessage}</p>}
      </form>
    </div>
  );
}
