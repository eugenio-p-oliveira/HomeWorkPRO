import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const DB_PATH = process.env.EDUSAAS_SQLITE_PATH || "./edusaas.db";

const sqlite = new Database(DB_PATH);
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export * from "./schema";
export { guardiansTable, studentGuardiansTable, parentMessagesTable, schoolEventsTable, parentTipsTable } from "./schema";
export { eq, and, or, sql, inArray, desc, count, gt, gte, lt, lte } from "drizzle-orm";
