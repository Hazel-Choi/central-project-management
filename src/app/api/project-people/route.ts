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
      SELECT DISTINCT p.PersonId, p.DisplayLabel
      FROM core.ProjectAssignment pa
      JOIN core.Person p ON p.PersonId = pa.PersonId
      WHERE pa.ProjectCode = @ProjectCode
      ORDER BY p.DisplayLabel
    `);
  return NextResponse.json(result.recordset);
}
