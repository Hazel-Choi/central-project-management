import sql from "mssql";

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



export { sql };
