import { Router } from "express";
import {
  db, examsTable, examSessionsTable, subjectsTable, activityLogTable, usersTable,
  classesTable, classStudentsTable
} from "@workspace/db";
import { eq, sql, and, inArray } from "drizzle-orm";
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

  // Monthly activity last 6 months
  const months: { month: string; sessionsCount: number; averageScore: number | null }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1); d.setHours(0, 0, 0, 0);
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

  // Subject breakdown with real data
  const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.tenantId, tid));
  const subjectBreakdown = computeSubjectBreakdown(subjects, allSessions);

  // Top performing class
  const classes = await db.select().from(classesTable).where(eq(classesTable.tenantId, tid));
  let topPerformingClass: { classId: number; className: string; averageScore: number } | null = null;
  if (classes.length > 0) {
    const classEnrollments = await db.select().from(classStudentsTable)
      .where(inArray(classStudentsTable.classId, classes.map(c => c.id)));
    const classBest = classes.map(cls => {
      const enrolled = classEnrollments.filter(e => e.classId === cls.id).map(e => e.studentId);
      const classSessions = completed.filter(s => enrolled.includes(s.exam_sessions.studentId));
      const classScores = classSessions.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
      const classMax = classSessions.map(s => parseFloat(String(s.exam_sessions.maxScore ?? 10)));
      const pcts = classScores.map((sc, i) => classMax[i] > 0 ? (sc / classMax[i]) * 10 : 0);
      const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
      return { classId: cls.id, className: cls.name, averageScore: avg, count: pcts.length };
    }).filter(c => c.count > 0).sort((a, b) => b.averageScore - a.averageScore);
    if (classBest.length > 0) topPerformingClass = { classId: classBest[0].classId, className: classBest[0].className, averageScore: classBest[0].averageScore };
  }

  // Most difficult subject (lowest average)
  const filledSubjects = subjectBreakdown.filter(s => s.totalAttempts > 0);
  const mostDifficultSubject = filledSubjects.length > 0
    ? filledSubjects.reduce((prev, cur) => (cur.averageScore ?? 10) < (prev.averageScore ?? 10) ? cur : prev)
    : null;

  res.json({
    totalExamsSessions: allSessions.length,
    averageScoreAllTime: avgScore,
    topPerformingClass,
    mostDifficultSubject: mostDifficultSubject ? { subjectId: mostDifficultSubject.subjectId, subjectName: mostDifficultSubject.subjectName, averageScore: mostDifficultSubject.averageScore } : null,
    monthlyActivity: months,
    subjectBreakdown,
  });
});

function computeSubjectBreakdown(subjects: any[], allSessions: any[]) {
  const completed = allSessions.filter(s => s.exam_sessions.status === "submitted");
  const bySubject: Record<number, number[]> = {};
  for (const row of completed) {
    const subjectId = row.exams.subjectId;
    if (!subjectId) continue;
    if (!bySubject[subjectId]) bySubject[subjectId] = [];
    const sc = parseFloat(String(row.exam_sessions.score ?? 0));
    const mx = parseFloat(String(row.exam_sessions.maxScore ?? 10));
    bySubject[subjectId].push(mx > 0 ? (sc / mx) * 10 : 0);
  }
  return subjects.map(s => {
    const scores = bySubject[s.id] ?? [];
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return {
      subjectId: s.id, subjectName: s.name,
      averageScore: avg, totalAttempts: scores.length,
      color: s.color ?? null,
    };
  });
}

router.get("/subject-performance", async (req, res) => {
  const tenant = (req as any).tenant;
  const tid = tenant.id;
  const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.tenantId, tid));
  const allSessions = await db.select().from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(and(eq(examsTable.tenantId, tid), sql`exam_sessions.status = 'submitted'`));
  const bySubject: Record<number, number[]> = {};
  for (const row of allSessions) {
    const subjectId = row.exams.subjectId;
    if (!subjectId) continue;
    if (!bySubject[subjectId]) bySubject[subjectId] = [];
    const sc = parseFloat(String(row.exam_sessions.score ?? 0));
    const mx = parseFloat(String(row.exam_sessions.maxScore ?? 10));
    bySubject[subjectId].push(mx > 0 ? (sc / mx) * 10 : 0);
  }
  res.json(subjects.map(s => {
    const scores = bySubject[s.id] ?? [];
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return {
      subjectId: s.id, subjectName: s.name,
      averageScore: avg, totalAttempts: scores.length,
      color: s.color ?? null,
    };
  }));
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
