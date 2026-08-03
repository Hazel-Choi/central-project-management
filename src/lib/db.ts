import sql from "mssql";
import { BurndownTicket } from "./types";

// Reuses a single connection pool across requests (Next.js keeps this module
// warm between invocations on the same server instance). Configure via
// .env.local — see .env.example for the required variables.
const config: sql.config = {
  server: process.env.SQL_SERVER ?? "",
  database: process.env.SQL_DATABASE ?? "",
  user: process.env.SQL_USER ?? "",
  password: process.env.SQL_PASSWORD ?? "",
  options: {
    encrypt: true, // required for Azure SQL
    trustServerCertificate: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Separate pool + separate credential for write-capable admin operations
// (milestones/sprints/holidays CRUD). Never share this login with the
// read-only reporting pool above — vercel_admin_writer has INSERT/UPDATE/
// DELETE on core.Milestone, core.Sprint, core.Holiday, core.Person only.
const adminConfig: sql.config = {
  server: process.env.SQL_SERVER ?? "",
  database: process.env.SQL_DATABASE ?? "",
  user: process.env.ADMIN_DB_USER ?? "vercel_admin_writer",
  password: process.env.ADMIN_DB_PASSWORD ?? "",
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;
let adminPoolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect();
  }
  return poolPromise;
}

export function getAdminPool(): Promise<sql.ConnectionPool> {
  if (!adminPoolPromise) {
    adminPoolPromise = new sql.ConnectionPool(adminConfig).connect();
  }
  return adminPoolPromise;
}

export async function getSprintBurndownTickets(
  projectCode: string,
  sprintName: string
): Promise<BurndownTicket[]> {
  const pool = await getPool();
  const result = await pool.request()
    .input("projectCode", sql.NVarChar, projectCode)
    .input("sprintName", sql.NVarChar, sprintName)
    .query(`
      SELECT WorkItemId AS workItemId, WorkItemType AS workItemType,
             EffortValue AS effortValue, State AS state,
             CreatedDate AS createdDate, StateChangeDate AS stateChangeDate
      FROM core.vw_SprintBurndownData
      WHERE ProjectCode = @projectCode AND SprintName = @sprintName
    `);
  return result.recordset;
}

export async function getSprintDates(
  projectCode: string,
  sprintName: string
): Promise<{ startDate: string; endDate: string } | null> {
  const pool = await getPool(); // ← swap to getAdminPool() if that's what sprints currently use
  const result = await pool.request()
    .input("projectCode", sql.NVarChar, projectCode)
    .input("sprintName", sql.NVarChar, sprintName)
    .query(`SELECT StartDate AS startDate, EndDate AS endDate FROM core.Sprint WHERE ProjectCode = @projectCode AND SprintName = @sprintName`);
  return result.recordset[0] ?? null;
}

export { sql };
