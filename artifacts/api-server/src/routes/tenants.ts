import { Router } from "express";
import { db, tenantsTable, usersTable, classesTable, examsTable, examSessionsTable } from "@workspace/db";
import { eq, count, avg, sql } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { z } from "zod";

const router = Router();

router.use(requireAuth);

router.get("/current", async (req, res) => {
  const tenant = (req as any).tenant;
  res.json({ ...tenant, createdAt: tenant.createdAt.toISOString(), updatedAt: tenant.updatedAt.toISOString() });
});

router.put("/current", requireRole("admin"), async (req, res) => {
  const tenant = (req as any).tenant;
  const parsed = z.object({
    name: z.string().trim().min(2).max(160),
    logoUrl: z.string().url().max(500).nullable().optional(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    educationalLevels: z.array(z.enum(["infantil", "fundamental", "medio", "tecnico", "superior"])).max(5).optional(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    return;
  }
  const { name, logoUrl, primaryColor, educationalLevels } = parsed.data;
  const [updated] = await db.update(tenantsTable)
    .set({ name, logoUrl, primaryColor, educationalLevels, updatedAt: new Date() })
    .where(eq(tenantsTable.id, tenant.id))
    .returning();
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.get("/stats", requireRole("admin", "coordinator", "teacher"), async (req, res) => {
  const tenant = (req as any).tenant;
  const tid = tenant.id;

  const [studentsResult] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.tenantId, tid));
  const [teachersResult] = await db.select({ count: count() }).from(usersTable)
    .where(sql`tenant_id = ${tid} AND role = 'teacher'`);
  const [classesResult] = await db.select({ count: count() }).from(classesTable).where(eq(classesTable.tenantId, tid));
  const [examsResult] = await db.select({ count: count() }).from(examsTable).where(eq(examsTable.tenantId, tid));
  const [activeExamsResult] = await db.select({ count: count() }).from(examsTable)
    .where(sql`tenant_id = ${tid} AND status = 'active'`);
  const [avgResult] = await db.select({ avg: avg(examSessionsTable.score) }).from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(eq(examsTable.tenantId, tid));
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0);
  const [thisMonthResult] = await db.select({ count: count() }).from(examsTable)
    .where(sql`tenant_id = ${tid} AND created_at >= ${thisMonth.toISOString()}`);
  const [totalSessionsResult] = await db.select({ count: count() }).from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(eq(examsTable.tenantId, tid));
  const [completedSessionsResult] = await db.select({ count: count() }).from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(sql`exams.tenant_id = ${tid} AND exam_sessions.status = 'submitted'`);

  const totalSessions = Number(totalSessionsResult?.count ?? 0);
  const completedSessions = Number(completedSessionsResult?.count ?? 0);

  res.json({
    totalStudents: Number(studentsResult?.count ?? 0),
    totalTeachers: Number(teachersResult?.count ?? 0),
    totalClasses: Number(classesResult?.count ?? 0),
    totalExams: Number(examsResult?.count ?? 0),
    activeExams: Number(activeExamsResult?.count ?? 0),
    averageScore: avgResult?.avg ? parseFloat(String(avgResult.avg)) : null,
    examsThisMonth: Number(thisMonthResult?.count ?? 0),
    completionRate: totalSessions > 0 ? completedSessions / totalSessions : 0,
  });
});

export default router;
