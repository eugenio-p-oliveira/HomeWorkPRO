import { pgTable, serial, text, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";
import { subjectsTable } from "./academic";

export const guardianRoleEnum = pgEnum("guardian_relation", ["parent", "stepparent", "grandparent", "guardian", "other"]);

export const guardiansTable = pgTable("guardians", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const studentGuardiansTable = pgTable("student_guardians", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  guardianId: integer("guardian_id").notNull().references(() => guardiansTable.id, { onDelete: "cascade" }),
  relation: guardianRoleEnum("relation").notNull().default("parent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messageTypeEnum = pgEnum("message_type", ["exam_alert", "exam_result", "activity_reminder", "general_tip", "custom_message"]);

export const parentMessagesTable = pgTable("parent_messages", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  guardianId: integer("guardian_id").notNull().references(() => guardiansTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: messageTypeEnum("type").notNull().default("custom_message"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const eventTypeEnum = pgEnum("event_type", ["exam", "holiday", "parent_meeting", "cultural", "sports", "deadline", "other"]);

export const schoolEventsTable = pgTable("school_events", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  eventType: eventTypeEnum("event_type").notNull().default("other"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at"),
  isAllDay: boolean("is_all_day").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const parentTipsTable = pgTable("parent_tips", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => subjectsTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
