import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { sqliteTimestamp } from "./sqlite";

export const roleEnum = ["admin", "coordinator", "teacher", "student"] as const;

export const usersTable = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: roleEnum }).notNull().default("student"),
  avatarUrl: text("avatar_url"),
  registrationNumber: text("registration_number"),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
  updatedAt: sqliteTimestamp("updated_at").notNull().default(new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
