import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";
import { classesTable } from "./academic";
import { subjectsTable, topicsTable } from "./academic";
import { sqliteTimestamp } from "./sqlite";

export const examTypeEnum = ["enem", "simulado", "traditional", "homework"] as const;
export const examStatusEnum = ["draft", "scheduled", "active", "closed"] as const;
export const questionTypeEnum = ["multiple_choice", "true_false"] as const;
export const sessionStatusEnum = ["in_progress", "submitted", "expired"] as const;

export const examsTable = sqliteTable("exams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type", { enum: examTypeEnum }).notNull(),
  status: text("status", { enum: examStatusEnum }).notNull().default("draft"),
  timeLimitMinutes: integer("time_limit_minutes"),
  startsAt: sqliteTimestamp("starts_at"),
  endsAt: sqliteTimestamp("ends_at"),
  maxAttempts: integer("max_attempts"),
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "set null" }),
  subjectId: integer("subject_id").references(() => subjectsTable.id, { onDelete: "set null" }),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  showResultImmediately: integer("show_result_immediately", { mode: "boolean" }).notNull().default(true),
  createdById: integer("created_by_id").notNull().references(() => usersTable.id),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
  updatedAt: sqliteTimestamp("updated_at").notNull().default(new Date()),
});

export const questionsTable = sqliteTable("questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  type: text("type", { enum: questionTypeEnum }).notNull(),
  statement: text("statement").notNull(),
  explanation: text("explanation"),
  topicId: integer("topic_id").references(() => topicsTable.id, { onDelete: "set null" }),
  points: real("points").notNull().default(1),
  order: integer("order").notNull().default(0),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
});

export const questionOptionsTable = sqliteTable("question_options", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionId: integer("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull().default(false),
  letter: text("letter").notNull(),
});

export const examSessionsTable = sqliteTable("exam_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  startedAt: sqliteTimestamp("started_at").notNull().default(new Date()),
  submittedAt: sqliteTimestamp("submitted_at"),
  endsAt: sqliteTimestamp("ends_at"),
  status: text("status", { enum: sessionStatusEnum }).notNull().default("in_progress"),
  score: real("score"),
  maxScore: real("max_score"),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
});

export const studentAnswersTable = sqliteTable("student_answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => examSessionsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  selectedOptionId: integer("selected_option_id").references(() => questionOptionsTable.id, { onDelete: "set null" }),
  isCorrect: integer("is_correct", { mode: "boolean" }),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
  updatedAt: sqliteTimestamp("updated_at").notNull().default(new Date()),
});

export const activityLogTable = sqliteTable("activity_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  createdAt: sqliteTimestamp("created_at").notNull().default(new Date()),
});

export const insertExamSchema = createInsertSchema(examsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof examsTable.$inferSelect;

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;

export const insertSessionSchema = createInsertSchema(examSessionsTable).omit({ id: true, createdAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type ExamSession = typeof examSessionsTable.$inferSelect;
