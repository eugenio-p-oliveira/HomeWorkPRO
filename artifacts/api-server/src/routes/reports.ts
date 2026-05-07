import { Router } from "express";
import { db, examsTable, examSessionsTable, subjectsTable, questionsTable, activityLogTable, usersTable } from "@workspace/db";
import { eq, sql, avg, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();
router.use(requireAuth);

router.get("/overview", async (req, res) => {
  const tenant = (req as any).tenant;
  const tid = tenant.id;
  const allSessions = await db.select().from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(eq(examsTable.tenantId, tid));
  const completed = allSessions.filter(s => s.exam_sessions.status === "submitted");
  const scores = completed.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  // Monthly activity for last 6 months
  const months: { month: string; sessionsCount: number; averageScore: number | null }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1); d.setHours(0,0,0,0);
    const end = new Date(d); end.setMonth(end.getMonth() + 1);
    const monthSessions = completed.filter(s => {
      const t = s.exam_sessions.startedAt;
      return t >= d && t < end;
    });
    const ms = monthSessions.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
    months.push({
      month: d.toLocaleString("pt-BR", { month: "short", year: "2-digit" }),
      sessionsCount: monthSessions.length,
      averageScore: ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : null,
    });
  }
  const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.tenantId, tid));
  res.json({
    totalExamsSessions: allSessions.length,
    averageScoreAllTime: avgScore,
    topPerformingClass: null,
    mostDifficultSubject: null,
    monthlyActivity: months,
    subjectBreakdown: subjects.map(s => ({
      subjectId: s.id, subjectName: s.name, averageScore: null, totalAttempts: 0, color: s.color ?? null,
    })),
  });
});

router.get("/subject-performance", async (req, res) => {
  const tenant = (req as any).tenant;
  const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.tenantId, tenant.id));
  res.json(subjects.map(s => ({
    subjectId: s.id, subjectName: s.name, averageScore: null, totalAttempts: 0, color: s.color ?? null,
  })));
});

router.get("/recent-activity", async (req, res) => {
  const tenant = (req as any).tenant;
  const activities = await db.select({
    activity: activityLogTable,
    user: { name: usersTable.name },
  }).from(activityLogTable)
    .innerJoin(usersTable, eq(activityLogTable.userId, usersTable.id))
    .where(eq(activityLogTable.tenantId, tenant.id))
    .orderBy(sql`${activityLogTable.createdAt} DESC`)
    .limit(20);
  res.json(activities.map(a => ({
    id: a.activity.id,
    type: a.activity.type,
    description: a.activity.description,
    userName: a.user.name,
    createdAt: a.activity.createdAt.toISOString(),
  })));
});

export default router;
