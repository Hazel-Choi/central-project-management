import { NextRequest, NextResponse } from 'next/server';
import { getAdminPool, sql } from '@/lib/db';

interface BatchEntry {
  personId: number;
  overrideDate: string;
  hoursOverride: number;
  note?: string | null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectCode, iterationOrSprint, entries } = body as {
    projectCode: string;
    iterationOrSprint: string;
    entries: BatchEntry[];
  };

  if (!projectCode || !iterationOrSprint || !Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: 'projectCode, iterationOrSprint, and entries are required' }, { status: 400 });
  }

  const table = new sql.Table('core.CapacityOverrideTableType');
  table.columns.add('PersonId', sql.Int, { nullable: false });
  table.columns.add('OverrideDate', sql.Date, { nullable: false });
  table.columns.add('HoursOverride', sql.Decimal(5, 2), { nullable: false });
  table.columns.add('Note', sql.NVarChar(200), { nullable: true });

  for (const e of entries) {
    table.rows.add(e.personId, e.overrideDate, e.hoursOverride, e.note ?? null);
  }

  const pool = await getAdminPool();
  await pool.request()
    .input('ProjectCode', sql.NVarChar, projectCode)
    .input('IterationOrSprint', sql.NVarChar, iterationOrSprint)
    .input('Entries', table)
    .query(`
      MERGE core.SprintCapacityOverride AS target
      USING (
        SELECT @ProjectCode AS ProjectCode, @IterationOrSprint AS IterationOrSprint,
               PersonId, OverrideDate, HoursOverride, Note
        FROM @Entries
      ) AS source
        ON target.ProjectCode = source.ProjectCode
       AND target.IterationOrSprint = source.IterationOrSprint
       AND target.PersonId = source.PersonId
       AND target.OverrideDate = source.OverrideDate
      WHEN MATCHED THEN
        UPDATE SET HoursOverride = source.HoursOverride, Note = source.Note
      WHEN NOT MATCHED THEN
        INSERT (ProjectCode, IterationOrSprint, PersonId, OverrideDate, HoursOverride, Note)
        VALUES (source.ProjectCode, source.IterationOrSprint, source.PersonId, source.OverrideDate, source.HoursOverride, source.Note);
    `);

  return NextResponse.json({ success: true, count: entries.length });
}
