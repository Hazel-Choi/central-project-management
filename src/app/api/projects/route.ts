import { getActiveProjects } from "@/lib/queries";

export async function GET() {
  const projects = await getActiveProjects();
  return Response.json(projects);
}

export async function getActiveProjects(): Promise<{ code: string; name: string }[]> {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT ProjectCode, ProjectName
    FROM core.vw_ProjectSummary
    ORDER BY ProjectName;
  `);
  return result.recordset.map((row) => ({
    code: row.ProjectCode,
    name: row.ProjectName,
  }));
}
