import { NextRequest, NextResponse } from 'next/server';
import { getPool, getAdminPool, sql } from '@/lib/db';

// GET: list overrides for a project + sprint
export async function GET(req: NextRequest) {
  const projectCode = req.nextUrl.searchParams.get('projectCode');
  const iterationOrSprint = req.nextUrl.searchParams.get('iterationOrSprint');
  if (!projectCode || !iterationOrSprint) {
    return NextResponse.json({ error: 'projectCode and iterationOrSprint are required' }, { status: 400 });
  }
  const pool = await getPool();
  const result = await pool.request()
    .input('ProjectCode', sql.NVarChar, projectCode)
    .input('IterationOrSprint', sql.NVarChar, iterationOrSprint)
    .query(`
      SELECT
        ov.SprintCapacityOverrideId, ov.PersonId, p.DisplayLabel AS PersonName,
        ov.OverrideDate, ov.HoursOverride, ov.Note, ov.CreatedUtc
      FROM core.SprintCapacityOverride ov
      JOIN core.Person p ON p.PersonId = ov.PersonId
      WHERE ov.ProjectCode = @ProjectCode AND ov.IterationOrSprint = @IterationOrSprint
      ORDER BY ov.OverrideDate DESC, p.DisplayLabel
    `);
  return NextResponse.json(result.recordset);
}

// POST: add or replace an override for a person/day (upsert on the unique constraint)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectCode, iterationOrSprint, personId, overrideDate, hoursOverride, note } = body;
  if (!projectCode || !iterationOrSprint || personId == null || !overrideDate || hoursOverride == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const pool = await getAdminPool();
  await pool.request()
    .input('ProjectCode', sql.NVarChar, projectCode)
    .input('IterationOrSprint', sql.NVarChar, iterationOrSprint)
    .input('PersonId', sql.Int, personId)
    .input('OverrideDate', sql.Date, overrideDate)
    .input('HoursOverride', sql.Decimal(5, 2), hoursOverride)
    .input('Note', sql.NVarChar, note ?? null)
    .query(`
      MERGE core.SprintCapacityOverride AS target
      USING (SELECT
        @ProjectCode AS ProjectCode, @IterationOrSprint AS IterationOrSprint,
        @PersonId AS PersonId, @OverrideDate AS OverrideDate) AS source
      ON target.ProjectCode = source.ProjectCode
        AND target.IterationOrSprint = source.IterationOrSprint
        AND target.PersonId = source.PersonId
        AND target.OverrideDate = source.OverrideDate
      WHEN MATCHED THEN
        UPDATE SET HoursOverride = @HoursOverride, Note = @Note
      WHEN NOT MATCHED THEN
        INSERT (ProjectCode, IterationOrSprint, PersonId, OverrideDate, HoursOverride, Note)
        VALUES (@ProjectCode, @IterationOrSprint, @PersonId, @OverrideDate, @HoursOverride, @Note);
    `);
  return NextResponse.json({ success: true });
}
