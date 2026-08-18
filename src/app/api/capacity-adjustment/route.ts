import { NextRequest, NextResponse } from 'next/server';
import { getPool, getAdminPool, sql } from '@/lib/db';
// GET: list capacity entries for a project + sprint
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
    .query(
      SELECT SprintCapacityId, ExternalCapacityHoursPerDay, ExternalTeamSize, EffectiveDate
      FROM core.SprintCapacity
      WHERE ProjectCode = @ProjectCode AND IterationOrSprint = @IterationOrSprint
      ORDER BY EffectiveDate DESC, SprintCapacityId DESC
    );
  return NextResponse.json(result.recordset);
}
// POST: add a new capacity entry
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectCode, iterationOrSprint, externalCapacityHoursPerDay, externalTeamSize } = body;
  if (!projectCode || !iterationOrSprint || externalCapacityHoursPerDay == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const pool = await getAdminPool();
  await pool.request()
    .input('ProjectCode', sql.NVarChar, projectCode)
    .input('IterationOrSprint', sql.NVarChar, iterationOrSprint)
    .input('ExternalCapacityHoursPerDay', sql.Decimal(6, 2), externalCapacityHoursPerDay)
    .input('ExternalTeamSize', sql.Int, externalTeamSize ?? null)
    .query(
      INSERT INTO core.SprintCapacity
        (ProjectCode, IterationOrSprint, ExternalCapacityHoursPerDay, ExternalTeamSize)
      VALUES
        (@ProjectCode, @IterationOrSprint, @ExternalCapacityHoursPerDay, @ExternalTeamSize)
    );
    // EffectiveDate defaults to today via the column default — not passed here
  return NextResponse.json({ success: true });
}
