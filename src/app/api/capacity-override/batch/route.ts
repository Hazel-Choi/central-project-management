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
 
  // Earliest override date per person in this batch. Used as the start date
  // for any ProjectAssignment row we have to create below.
  const earliestDateByPerson = new Map<number, string>();
  for (const e of entries) {
    const prior = earliestDateByPerson.get(e.personId);
    if (!prior || e.overrideDate < prior) {
      earliestDateByPerson.set(e.personId, e.overrideDate);
    }
  }
 
  const pool = await getAdminPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
 
  try {
    // Ensure every person in this batch has a core.ProjectAssignment row for
    // this project. "Add person from tickets" in CapacityGridSection lets
    // you save capacity for someone who was never formally assigned — but
    // core.vw_PersonDailyCapacity INNER JOINs to ProjectAssignment, so
    // without a row here their saved hours are silently orphaned and they
    // may never appear in Individual Capacity at all (root cause traced in
    // individual-capacity-report-schema.md). We backfill a minimal
    // open-ended assignment (0h weekday template — their actual hours come
    // entirely from the SprintCapacityOverride rows below) only if one
    // doesn't already exist, so this never overwrites a real assignment's
    // dates or weekly hours.
    for (const [personId, startDate] of earliestDateByPerson) {
      await transaction.request()
        .input('ProjectCode', sql.NVarChar, projectCode)
        .input('PersonId', sql.Int, personId)
        .input('StartDate', sql.Date, startDate)
        .query(`
          IF NOT EXISTS (
            SELECT 1 FROM core.ProjectAssignment
            WHERE ProjectCode = @ProjectCode AND PersonId = @PersonId
          )
          INSERT INTO core.ProjectAssignment
            (ProjectCode, PersonId, AssignmentStartDate, AssignmentEndDate,
             MonHours, TueHours, WedHours, ThuHours, FriHours)
          VALUES
            (@ProjectCode, @PersonId, @StartDate, NULL, 0, 0, 0, 0, 0);
        `);
    }
 
    await transaction.request()
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
 
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
 
  return NextResponse.json({ success: true, count: entries.length });
}
