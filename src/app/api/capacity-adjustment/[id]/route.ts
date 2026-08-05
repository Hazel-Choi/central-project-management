import { NextRequest, NextResponse } from 'next/server';
import { getAdminPool, sql } from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const pool = await getAdminPool();
  await pool.request()
    .input('Id', sql.Int, parseInt(id, 10))
    .query(`DELETE FROM core.SprintCapacityAdjustment WHERE SprintCapacityAdjustmentId = @Id`);

  return NextResponse.json({ success: true });
}
