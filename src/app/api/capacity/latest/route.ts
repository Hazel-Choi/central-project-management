import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

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
