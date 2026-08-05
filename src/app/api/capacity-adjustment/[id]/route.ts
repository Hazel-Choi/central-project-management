import { NextRequest, NextResponse } from 'next/server';
import { getAdminPool, sql } from '@/lib/db';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const pool = await getAdminPool();
  await pool.request()
    .input('Id', sql.Int, parseInt(params.id, 10))
    .query(`DELETE FROM core.SprintCapacityAdjustment WHERE SprintCapacityAdjustmentId = @Id`);

  return NextResponse.json({ success: true });
}
