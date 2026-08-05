import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db'; // adjust to match your actual db helper
import sql from 'mssql';

// GET: fetch the most recent capacity entry for a project, for autofill
export async function GET(req: NextRequest) {
  const projectCode = req.nextUrl.searchParams.get('projectCode');
  if (!projectCode) {
    return NextResponse.json({ error: 'projectCode is required' }, { status: 400 });
  }

  const pool = await getPool();
  const result = await pool.request()
    .input('ProjectCode', sql.NVarChar, projectCode)
    .query(`
      SELECT TOP 1 ExternalCapacityHoursPerDay, ExternalTeamSize
      FROM core.SprintCapacity
      WHERE ProjectCode = @ProjectCode
      ORDER BY EffectiveDate DESC, SprintCapacityId DESC
    `);

  return NextResponse.json(result.recordset[0] ?? null);
}

// POST: insert a new capacity entry
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectCode, iterationOrSprint, externalCapacityHoursPerDay, externalTeamSize } = body;

  if (!projectCode || !iterationOrSprint || externalCapacityHoursPerDay == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const pool = await getPool();
  await pool.request()
    .input('ProjectCode', sql.NVarChar, projectCode)
    .input('IterationOrSprint', sql.NVarChar, iterationOrSprint)
    .input('ExternalCapacityHoursPerDay', sql.Decimal(6, 2), externalCapacityHoursPerDay)
    .input('ExternalTeamSize', sql.Int, externalTeamSize ?? null)
    .query(`
      INSERT INTO core.SprintCapacity
        (ProjectCode, IterationOrSprint, ExternalCapacityHoursPerDay, ExternalTeamSize)
      VALUES
        (@ProjectCode, @IterationOrSprint, @ExternalCapacityHoursPerDay, @ExternalTeamSize)
    `);
    // EffectiveDate is not passed — the column's DEFAULT CAST(GETDATE() AS DATE) fills it in

  return NextResponse.json({ success: true });
}
