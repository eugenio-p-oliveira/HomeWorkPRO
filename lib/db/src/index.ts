import path from "node:path";
import fs from "node:fs";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { ensureSqliteSchema } from "./schema-init";

function resolveSqlitePath(): string {
  const configuredPath = process.env.EDUSAAS_SQLITE_PATH?.trim();
  if (configuredPath) return path.resolve(configuredPath);

  // Development runs from artifacts/api-server; published API runs from
  // the monorepo root. Keep both environments pointed at the same database.
  const runningFromApiArtifact = path.basename(process.cwd()) === "api-server";
  return runningFromApiArtifact
    ? path.join(process.cwd(), "edusaas.db")
    : path.join(process.cwd(), "artifacts", "api-server", "edusaas.db");
}

const DB_PATH = resolveSqlitePath();
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  const configuredPath = process.env.EDUSAAS_SQLITE_PATH?.trim();
  if (!configuredPath) {
    throw new Error(
      "EDUSAAS_SQLITE_PATH is required in production; refusing to create or seed an unknown SQLite database.",
    );
  }

  let stats: fs.Stats;
  try {
    stats = fs.statSync(DB_PATH);
  } catch (error) {
    throw new Error(
      `Production SQLite database was not found at "${DB_PATH}"; refusing to start without the configured database.`,
      { cause: error },
    );
  }
  if (!stats.isFile()) {
    throw new Error(
      `Production SQLite path "${DB_PATH}" is not a regular file; refusing to start.`,
    );
  }
}

const sqlite = new Database(DB_PATH, { fileMustExist: isProduction });
sqlite.pragma("foreign_keys = ON");
ensureSqliteSchema(sqlite);

export const db = drizzle(sqlite, { schema });
export const sqliteDatabasePath = DB_PATH;

export * from "./schema";
export { guardiansTable, studentGuardiansTable, parentMessagesTable, schoolEventsTable, parentTipsTable } from "./schema";
export {
  eq, and, or, sql, inArray, desc, asc, count, avg, gt, gte, lt, lte, ilike,
} from "drizzle-orm";
