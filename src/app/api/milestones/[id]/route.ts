import { NextRequest, NextResponse } from "next/server";
import { getAdminPool, sql } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const milestoneId = Number(id);
  const { title, description, date } = await request.json();

  if (!title || !date) {
    return NextResponse.json({ error: "title and date are required" }, { status: 400 });
  }

  const pool = await getAdminPool();
  const result = await pool
    .request()
    .input("milestoneId", sql.Int, milestoneId)
    .input("title", sql.NVarChar, title)
    .input("description", sql.NVarChar, description ?? null)
    .input("date", sql.Date, date).query(`
      UPDATE core.Milestone
      SET Title = @title, Description = @description, MilestoneDate = @date
      OUTPUT INSERTED.MilestoneId, INSERTED.ProjectCode, INSERTED.Title, INSERTED.Description, INSERTED.MilestoneDate
      WHERE MilestoneId = @milestoneId;
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
  const milestoneId = Number(id);

  const pool = await getAdminPool();
  const result = await pool
    .request()
    .input("milestoneId", sql.Int, milestoneId)
    .query(`DELETE FROM core.Milestone OUTPUT DELETED.MilestoneId WHERE MilestoneId = @milestoneId;`);

  if (result.recordset.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
