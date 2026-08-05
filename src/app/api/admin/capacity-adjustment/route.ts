import { NextRequest, NextResponse } from 'next/server';
import { getAdminPool, sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectCode, iterationOrSprint, adjustmentDate, hoursDelta, note } = body;

  if (!projectCode || !iterationOrSprint || !adjustmentDate || hoursDelta == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const pool = await getAdminPool();
  await pool.request()
    .input('ProjectCode', sql.NVarChar, projectCode)
    .input('IterationOrSprint', sql.NVarChar, iterationOrSprint)
    .input('AdjustmentDate', sql.Date, adjustmentDate)
    .input('HoursDelta', sql.Decimal(6, 2), hoursDelta)
    .input('Note', sql.NVarChar, note ?? null)
    .query(`
      INSERT INTO core.SprintCapacityAdjustment
        (ProjectCode, IterationOrSprint, AdjustmentDate, HoursDelta, Note)
      VALUES
        (@ProjectCode, @IterationOrSprint, @AdjustmentDate, @HoursDelta, @Note)
    `);

  return NextResponse.json({ success: true });
}
