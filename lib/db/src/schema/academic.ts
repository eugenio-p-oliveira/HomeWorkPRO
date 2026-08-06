import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";
import { sqliteTimestamp } from "./sqlite";

export const educationalLevelEnum = [
  "infantil",
  "fundamental",
  "medio",
  "tecnico",
  "superior",
] as const;

export const shiftEnum = ["manha", "tarde", "noite", "integral"] as const;

export const subjectsTable = sqliteTable("subjects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color"),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
});

export const topicsTable = sqliteTable("topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
});

export const seriesTable = sqliteTable("series", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  educationalLevel: text("educational_level", { enum: educationalLevelEnum }).notNull(),
  order: integer("order").notNull().default(0),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
});

export const classesTable = sqliteTable("classes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  serieId: integer("serie_id").notNull().references(() => seriesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  shift: text("shift", { enum: shiftEnum }).notNull(),
  year: integer("year").notNull(),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
});

export const classStudentsTable = sqliteTable("class_students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  classId: integer("class_id").notNull().references(() => classesTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  enrolledAt: sqliteTimestamp("enrolled_at").notNull().default(new Date()),
});

export const insertSubjectSchema = createInsertSchema(subjectsTable).omit({ id: true, createdAt: true });
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjectsTable.$inferSelect;

export const insertTopicSchema = createInsertSchema(topicsTable).omit({ id: true, createdAt: true });
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topicsTable.$inferSelect;

export const insertSerieSchema = createInsertSchema(seriesTable).omit({ id: true, createdAt: true });
export type InsertSerie = z.infer<typeof insertSerieSchema>;
export type Serie = typeof seriesTable.$inferSelect;

export const insertClassSchema = createInsertSchema(classesTable).omit({ id: true, createdAt: true });
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Class = typeof classesTable.$inferSelect;
