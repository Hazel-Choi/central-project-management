import sql from "mssql";

// Reuses a single connection pool across requests (Next.js keeps this module
// warm between invocations on the same server instance). Configure via
// .env.local — see .env.example for the required variables.
//
// connectionTimeout/requestTimeout are raised from the mssql default (15s)
// because this database runs on Azure SQL serverless (free tier), which
// auto-pauses after 1hr of inactivity. The first connection after a pause
// triggers a resume that can take longer than 15s to complete, so a short
// timeout here produces spurious ETIMEOUT errors even though the database
// is healthy — it just hasn't finished waking up yet.
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
  connectionTimeout: 30000,
  requestTimeout: 30000,
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
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;
let adminPoolPromise: Promise<sql.ConnectionPool> | null = null;

const RETRY_DELAY_MS = 5000;

/**
 * Connects with one retry on ETIMEOUT, to ride out Azure SQL serverless
 * auto-resume (first request after a >1hr idle pause can take longer than
 * a single connection attempt to succeed).
 */
async function connectWithRetry(cfg: sql.config): Promise<sql.ConnectionPool> {
  try {
    return await new sql.ConnectionPool(cfg).connect();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ETIMEOUT") {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return new sql.ConnectionPool(cfg).connect();
    }
    throw err;
  }
}

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = connectWithRetry(config).catch((err) => {
      // Clear the cached promise on failure so the next call retries fresh
      // instead of returning this same rejected promise forever.
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

export function getAdminPool(): Promise<sql.ConnectionPool> {
  if (!adminPoolPromise) {
    adminPoolPromise = connectWithRetry(adminConfig).catch((err) => {
      adminPoolPromise = null;
      throw err;
    });
  }
  return adminPoolPromise;
}

export { sql };
