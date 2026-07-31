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
      SELECT DISTINCT h.HolidayId, p.PersonId, p.Email, p.DisplayLabel AS PersonLabel, h.StartDate, h.EndDate
      FROM core.Holiday h
      JOIN core.Person p ON p.PersonId = h.PersonId
      WHERE EXISTS (
        SELECT 1 FROM core.SharePointWorkItem w
        WHERE w.AssignedTo = p.Email AND w.ProjectCode = @projectCode
      )
      ORDER BY h.StartDate;
    `);

  return NextResponse.json(result.recordset);
}

export async function POST(request: NextRequest) {
  const { personEmail, personLabel, startDate, endDate } = await request.json();
  if (!personEmail || !personLabel || !startDate || !endDate) {
    return NextResponse.json(
      { error: "personEmail, personLabel, startDate, and endDate are required" },
      { status: 400 }
    );
  }

  const pool = await getAdminPool();

  // Find or create the person by email
  const existing = await pool
    .request()
    .input("email", sql.NVarChar, personEmail)
    .query(`SELECT PersonId FROM core.Person WHERE Email = @email;`);

  let personId: number;
  if (existing.recordset.length > 0) {
    personId = existing.recordset[0].PersonId;
  } else {
    const inserted = await pool
      .request()
      .input("email", sql.NVarChar, personEmail)
      .input("label", sql.NVarChar, personLabel)
      .query(`
        INSERT INTO core.Person (Email, DisplayLabel)
        OUTPUT INSERTED.PersonId
        VALUES (@email, @label);
      `);
    personId = inserted.recordset[0].PersonId;
  }

  const result = await pool
    .request()
    .input("personId", sql.Int, personId)
    .input("startDate", sql.Date, startDate)
    .input("endDate", sql.Date, endDate).query(`
      INSERT INTO core.Holiday (PersonId, StartDate, EndDate)
      OUTPUT INSERTED.HolidayId, INSERTED.PersonId, INSERTED.StartDate, INSERTED.EndDate
      VALUES (@personId, @startDate, @endDate);
    `);

  return NextResponse.json(
    { ...result.recordset[0], personEmail, personLabel },
    { status: 201 }
  );
}
