import { NextRequest, NextResponse } from "next/server";
import { getAdminPool, sql } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const holidayId = Number(id);
  const { startDate, endDate } = await request.json();

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
  }

  const pool = await getAdminPool();
  const result = await pool
    .request()
    .input("holidayId", sql.Int, holidayId)
    .input("startDate", sql.Date, startDate)
    .input("endDate", sql.Date, endDate).query(`
      UPDATE core.Holiday
      SET StartDate = @startDate, EndDate = @endDate
      OUTPUT INSERTED.HolidayId, INSERTED.PersonId, INSERTED.StartDate, INSERTED.EndDate
      WHERE HolidayId = @holidayId;
    `);

  if (result.recordset.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(result.recordset[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const holidayId = Number(id);

  const pool = await getAdminPool();
  const result = await pool
    .request()
    .input("holidayId", sql.Int, holidayId)
    .query(`DELETE FROM core.Holiday OUTPUT DELETED.HolidayId WHERE HolidayId = @holidayId;`);

  if (result.recordset.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
