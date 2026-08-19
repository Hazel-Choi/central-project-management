import { NextRequest, NextResponse } from "next/server";
import { getProjectPeople } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const projectCode = req.nextUrl.searchParams.get("projectCode");
  if (!projectCode) {
    return NextResponse.json({ error: "projectCode is required" }, { status: 400 });
  }
  const people = await getProjectPeople(projectCode);
  return NextResponse.json(people);
}
