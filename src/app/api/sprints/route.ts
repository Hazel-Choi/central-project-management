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
      SELECT SprintId, ProjectCode, SprintName, StartDate, EndDate
      FROM core.Sprint
      WHERE ProjectCode = @projectCode
      ORDER BY StartDate;
    `);

  return NextResponse.json(result.recordset);
}

export async function POST(request: NextRequest) {
  const { projectCode, sprintName, startDate, endDate } = await request.json();
  if (!projectCode || !sprintName || !startDate || !endDate) {
    return NextResponse.json(
      { error: "projectCode, sprintName, startDate, and endDate are required" },
      { status: 400 }
    );
  }

  const pool = await getAdminPool();
  const result = await pool
    .request()
    .input("projectCode", sql.NVarChar, projectCode)
    .input("sprintName", sql.NVarChar, sprintName)
    .input("startDate", sql.Date, startDate)
    .input("endDate", sql.Date, endDate).query(`
      INSERT INTO core.Sprint (ProjectCode, SprintName, StartDate, EndDate)
      OUTPUT INSERTED.SprintId, INSERTED.ProjectCode, INSERTED.SprintName, INSERTED.StartDate, INSERTED.EndDate
      VALUES (@projectCode, @sprintName, @startDate, @endDate);
    `);

  return NextResponse.json(result.recordset[0], { status: 201 });
}
