import { pgTable, serial, text, integer, timestamp, boolean, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";
import { classesTable } from "./academic";
import { subjectsTable, topicsTable } from "./academic";

export const examTypeEnum = pgEnum("exam_type", ["enem", "simulado", "traditional", "homework"]);
export const examStatusEnum = pgEnum("exam_status", ["draft", "scheduled", "active", "closed"]);
export const questionTypeEnum = pgEnum("question_type", ["multiple_choice", "true_false"]);
export const sessionStatusEnum = pgEnum("session_status", ["in_progress", "submitted", "expired"]);

export const examsTable = pgTable("exams", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: examTypeEnum("type").notNull(),
  status: examStatusEnum("status").notNull().default("draft"),
  timeLimitMinutes: integer("time_limit_minutes"),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  maxAttempts: integer("max_attempts"),
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "set null" }),
  subjectId: integer("subject_id").references(() => subjectsTable.id, { onDelete: "set null" }),
  isPublic: boolean("is_public").notNull().default(false),
  showResultImmediately: boolean("show_result_immediately").notNull().default(true),
  createdById: integer("created_by_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  type: questionTypeEnum("type").notNull(),
  statement: text("statement").notNull(),
  explanation: text("explanation"),
  topicId: integer("topic_id").references(() => topicsTable.id, { onDelete: "set null" }),
  points: numeric("points", { precision: 5, scale: 2 }).notNull().default("1"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const questionOptionsTable = pgTable("question_options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  letter: text("letter").notNull(),
});

export const examSessionsTable = pgTable("exam_sessions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  submittedAt: timestamp("submitted_at"),
  endsAt: timestamp("ends_at"),
  status: sessionStatusEnum("status").notNull().default("in_progress"),
  score: numeric("score", { precision: 8, scale: 2 }),
  maxScore: numeric("max_score", { precision: 8, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const studentAnswersTable = pgTable("student_answers", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => examSessionsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  selectedOptionId: integer("selected_option_id").references(() => questionOptionsTable.id, { onDelete: "set null" }),
  isCorrect: boolean("is_correct"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const activityLogTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
