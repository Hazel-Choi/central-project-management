import { NextRequest, NextResponse } from "next/server";
import { getAdminPool, sql } from "@/lib/db";

export async function GET(request: NextRequest) {
  const projectCode = request.nextUrl.searchParams.get("projectCode");
  if (!projectCode) {
    return NextResponse.json({ error: "projectCode is required" }, { status: 400 });
  }

  const pool = await getAdminPool();
  const result = await pool
    .request()
    .input("projectCode", sql.NVarChar, projectCode).query(`
      SELECT MilestoneId, ProjectCode, Title, Description, MilestoneDate
      FROM core.Milestone
      WHERE ProjectCode = @projectCode
      ORDER BY MilestoneDate;
    `);

  return NextResponse.json(result.recordset);
}

export async function POST(request: NextRequest) {
  const { projectCode, title, description, date } = await request.json();
  if (!projectCode || !title || !date) {
    return NextResponse.json(
      { error: "projectCode, title, and date are required" },
      { status: 400 }
    );
  }

  const pool = await getAdminPool();
  const result = await pool
    .request()
    .input("projectCode", sql.NVarChar, projectCode)
    .input("title", sql.NVarChar, title)
    .input("description", sql.NVarChar, description ?? null)
    .input("date", sql.Date, date).query(`
      INSERT INTO core.Milestone (ProjectCode, Title, Description, MilestoneDate)
      OUTPUT INSERTED.MilestoneId, INSERTED.ProjectCode, INSERTED.Title, INSERTED.Description, INSERTED.MilestoneDate
      VALUES (@projectCode, @title, @description, @date);
    `);

  return NextResponse.json(result.recordset[0], { status: 201 });
}
