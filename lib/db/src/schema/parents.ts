import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";
import { subjectsTable } from "./academic";
import { sqliteTimestamp } from "./sqlite";

export const guardianRoleEnum = ["parent", "stepparent", "grandparent", "guardian", "other"] as const;

export const guardiansTable = sqliteTable("guardians", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
  updatedAt: sqliteTimestamp("updated_at").notNull().default(new Date()),
});

export const studentGuardiansTable = sqliteTable("student_guardians", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  guardianId: integer("guardian_id").notNull().references(() => guardiansTable.id, { onDelete: "cascade" }),
  relation: text("relation", { enum: guardianRoleEnum }).notNull().default("parent"),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
});

export const messageTypeEnum = ["exam_alert", "exam_result", "activity_reminder", "general_tip", "custom_message"] as const;

export const parentMessagesTable = sqliteTable("parent_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  guardianId: integer("guardian_id").notNull().references(() => guardiansTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type", { enum: messageTypeEnum }).notNull().default("custom_message"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
});

export const eventTypeEnum = ["exam", "holiday", "parent_meeting", "cultural", "sports", "deadline", "other"] as const;

export const schoolEventsTable = sqliteTable("school_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type", { enum: eventTypeEnum }).notNull().default("other"),
  startsAt: sqliteTimestamp("starts_at").notNull(),
  endsAt: sqliteTimestamp("ends_at"),
  isAllDay: integer("is_all_day", { mode: "boolean" }).notNull().default(false),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
});

export const parentTipsTable = sqliteTable("parent_tips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => subjectsTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
});

export const insertGuardianSchema = createInsertSchema(guardiansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGuardian = z.infer<typeof insertGuardianSchema>;
export type Guardian = typeof guardiansTable.$inferSelect;

export const insertStudentGuardianSchema = createInsertSchema(studentGuardiansTable).omit({ id: true, createdAt: true });
export type InsertStudentGuardian = z.infer<typeof insertStudentGuardianSchema>;

export const insertParentMessageSchema = createInsertSchema(parentMessagesTable).omit({ id: true, createdAt: true, isRead: true });
export type InsertParentMessage = z.infer<typeof insertParentMessageSchema>;

export const insertSchoolEventSchema = createInsertSchema(schoolEventsTable).omit({ id: true, createdAt: true });
export type InsertSchoolEvent = z.infer<typeof insertSchoolEventSchema>;

export const insertParentTipSchema = createInsertSchema(parentTipsTable).omit({ id: true, createdAt: true });
export type InsertParentTip = z.infer<typeof insertParentTipSchema>;
