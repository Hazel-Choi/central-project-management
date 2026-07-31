import { NextRequest, NextResponse } from "next/server";
import { getAdminPool, sql } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sprintId = Number(id);
  const { sprintName, startDate, endDate } = await request.json();

  if (!sprintName || !startDate || !endDate) {
    return NextResponse.json(
      { error: "sprintName, startDate, and endDate are required" },
      { status: 400 }
    );
  }

  const pool = await getAdminPool();
  const result = await pool
    .request()
    .input("sprintId", sql.Int, sprintId)
    .input("sprintName", sql.NVarChar, sprintName)
    .input("startDate", sql.Date, startDate)
    .input("endDate", sql.Date, endDate).query(`
      UPDATE core.Sprint
      SET SprintName = @sprintName, StartDate = @startDate, EndDate = @endDate
      OUTPUT INSERTED.SprintId, INSERTED.ProjectCode, INSERTED.SprintName, INSERTED.StartDate, INSERTED.EndDate
      WHERE SprintId = @sprintId;
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
  const sprintId = Number(id);

  const pool = await getAdminPool();
  const result = await pool
    .request()
    .input("sprintId", sql.Int, sprintId)
    .query(`DELETE FROM core.Sprint OUTPUT DELETED.SprintId WHERE SprintId = @sprintId;`);

  if (result.recordset.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
