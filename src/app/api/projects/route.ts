import { getActiveProjects } from "@/lib/queries";

export async function GET() {
  const projects = await getActiveProjects();
  return Response.json(projects);
}
