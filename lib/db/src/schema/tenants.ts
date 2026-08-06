import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sqliteTimestamp } from "./sqlite";

export const planEnum = ["free", "basic", "premium"] as const;

export const tenantsTable = sqliteTable("tenants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  plan: text("plan", { enum: planEnum }).notNull().default("free"),
  educationalLevels: text("educational_levels", { mode: "json" }).$type<string[]>().notNull().default([]),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
  updatedAt: sqliteTimestamp("updated_at").notNull().default(new Date()),
});

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;
