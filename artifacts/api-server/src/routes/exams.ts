import { Router } from "express";
import {
  db, examsTable, questionsTable, questionOptionsTable, examSessionsTable, studentAnswersTable,
  usersTable, subjectsTable, classesTable
} from "@workspace/db";
import { eq, and, sql, count, avg } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { activityLogTable } from "@workspace/db";

const router = Router();
router.use(requireAuth);

async function getExamWithQuestions(examId: number) {
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
  if (!exam) return null;
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, examId))
    .orderBy(questionsTable.order);
  const questionIds = questions.map(q => q.id);
  let options: any[] = [];
  if (questionIds.length > 0) {
    options = await db.select().from(questionOptionsTable).where(sql`question_id = ANY(${questionIds})`);
  }
  const optsByQ = options.reduce((acc: any, o) => {
    if (!acc[o.questionId]) acc[o.questionId] = [];
    acc[o.questionId].push(o);
    return acc;
  }, {});
  return {
    ...exam,
    questionsCount: questions.length,
    createdAt: exam.createdAt.toISOString(),
    updatedAt: exam.updatedAt.toISOString(),
    startsAt: exam.startsAt?.toISOString() ?? null,
    endsAt: exam.endsAt?.toISOString() ?? null,
    questions: questions.map(q => ({
      ...q,
      points: parseFloat(String(q.points)),
      createdAt: q.createdAt.toISOString(),
      options: optsByQ[q.id] ?? [],
    })),
  };
}

router.get("/", async (req, res) => {
  const tenant = (req as any).tenant;
  const { status, type, classId } = req.query as any;
  const conditions = [eq(examsTable.tenantId, tenant.id)];
  if (status) conditions.push(eq(examsTable.status, status as any));
  if (type) conditions.push(eq(examsTable.type, type as any));
  if (classId) conditions.push(eq(examsTable.classId, parseInt(classId)));
  const exams = await db.select().from(examsTable).where(and(...conditions));
  const examIds = exams.map(e => e.id);
  let qCounts: Record<number, number> = {};
  if (examIds.length > 0) {
    const counts = await db.select({ examId: questionsTable.examId, cnt: count() })
      .from(questionsTable).where(sql`exam_id = ANY(${examIds})`).groupBy(questionsTable.examId);
    qCounts = Object.fromEntries(counts.map(c => [c.examId, Number(c.cnt)]));
  }
  res.json(exams.map(e => ({
    ...e,
    questionsCount: qCounts[e.id] ?? 0,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    startsAt: e.startsAt?.toISOString() ?? null,
    endsAt: e.endsAt?.toISOString() ?? null,
  })));
});

router.post("/", async (req, res) => {
  const tenant = (req as any).tenant;
  const user = (req as any).user;
  const { title, type, timeLimitMinutes, startsAt, endsAt, maxAttempts, classId, subjectId, isPublic, showResultImmediately } = req.body;
  const [exam] = await db.insert(examsTable).values({
    tenantId: tenant.id,
    title,
    type,
    timeLimitMinutes,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    maxAttempts,
    classId,
    subjectId,
    isPublic: isPublic ?? false,
    showResultImmediately: showResultImmediately ?? true,
    createdById: user.id,
  }).returning();
  await db.insert(activityLogTable).values({
    tenantId: tenant.id,
    userId: user.id,
    type: "exam_created",
    description: `Prova "${title}" criada`,
  }).catch(() => {});
  res.status(201).json({
    ...exam, questionsCount: 0,
    createdAt: exam.createdAt.toISOString(), updatedAt: exam.updatedAt.toISOString(),
    startsAt: exam.startsAt?.toISOString() ?? null, endsAt: exam.endsAt?.toISOString() ?? null,
  });
});

router.get("/:id", async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(req.params.id);
  const exam = await getExamWithQuestions(id);
  if (!exam || exam.tenantId !== tenant.id) { res.status(404).json({ error: "Not found" }); return; }
  res.json(exam);
});

router.put("/:id", async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(req.params.id);
  const { title, type, timeLimitMinutes, startsAt, endsAt, maxAttempts, classId, subjectId, isPublic, showResultImmediately } = req.body;
  const [exam] = await db.update(examsTable).set({
    title, type, timeLimitMinutes,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    maxAttempts, classId, subjectId, isPublic, showResultImmediately, updatedAt: new Date(),
  }).where(and(eq(examsTable.id, id), eq(examsTable.tenantId, tenant.id))).returning();
  if (!exam) { res.status(404).json({ error: "Not found" }); return; }
  const [qCount] = await db.select({ cnt: count() }).from(questionsTable).where(eq(questionsTable.examId, id));
  res.json({
    ...exam, questionsCount: Number(qCount?.cnt ?? 0),
    createdAt: exam.createdAt.toISOString(), updatedAt: exam.updatedAt.toISOString(),
    startsAt: exam.startsAt?.toISOString() ?? null, endsAt: exam.endsAt?.toISOString() ?? null,
  });
});

router.delete("/:id", async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(req.params.id);
  await db.delete(examsTable).where(and(eq(examsTable.id, id), eq(examsTable.tenantId, tenant.id)));
  res.json({ success: true });
});

router.post("/:id/publish", async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(req.params.id);
  const [exam] = await db.update(examsTable).set({ status: "scheduled", updatedAt: new Date() })
    .where(and(eq(examsTable.id, id), eq(examsTable.tenantId, tenant.id))).returning();
  if (!exam) { res.status(404).json({ error: "Not found" }); return; }
  const [qCount] = await db.select({ cnt: count() }).from(questionsTable).where(eq(questionsTable.examId, id));
  res.json({
    ...exam, questionsCount: Number(qCount?.cnt ?? 0),
    createdAt: exam.createdAt.toISOString(), updatedAt: exam.updatedAt.toISOString(),
    startsAt: exam.startsAt?.toISOString() ?? null, endsAt: exam.endsAt?.toISOString() ?? null,
  });
});

router.get("/:id/report", async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(req.params.id);
  const [exam] = await db.select().from(examsTable).where(and(eq(examsTable.id, id), eq(examsTable.tenantId, tenant.id)));
  if (!exam) { res.status(404).json({ error: "Not found" }); return; }
  const sessions = await db.select().from(examSessionsTable).where(eq(examSessionsTable.examId, id));
  const completed = sessions.filter(s => s.status === "submitted");
  const scores = completed.map(s => parseFloat(String(s.score ?? 0)));
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const avgTime = completed.filter(s => s.submittedAt).map(s =>
    (s.submittedAt!.getTime() - s.startedAt.getTime()) / 60000
  );
  const avgTimeMinutes = avgTime.length ? avgTime.reduce((a, b) => a + b, 0) / avgTime.length : null;
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, id));
  const sessionIds = completed.map(s => s.id);
  let answers: any[] = [];
  if (sessionIds.length > 0) {
    answers = await db.select().from(studentAnswersTable).where(sql`session_id = ANY(${sessionIds})`);
  }
  const questionStats = questions.map(q => {
    const qAnswers = answers.filter(a => a.questionId === q.id);
    const correctCount = qAnswers.filter(a => a.isCorrect).length;
    const optDist: Record<number, number> = {};
    qAnswers.forEach(a => { if (a.selectedOptionId) optDist[a.selectedOptionId] = (optDist[a.selectedOptionId] ?? 0) + 1; });
    return {
      questionId: q.id,
      statement: q.statement.slice(0, 100),
      correctRate: qAnswers.length ? correctCount / qAnswers.length : 0,
      totalAnswers: qAnswers.length,
      optionDistribution: Object.entries(optDist).map(([optId, cnt]) => ({
        optionId: parseInt(optId), letter: "", count: cnt, isCorrect: false,
      })),
    };
  });
  const scoreRanges = [
    { range: "0-25%", count: 0 }, { range: "25-50%", count: 0 },
    { range: "50-75%", count: 0 }, { range: "75-100%", count: 0 },
  ];
  completed.forEach(s => {
    const pct = s.score && s.maxScore ? parseFloat(String(s.score)) / parseFloat(String(s.maxScore)) * 100 : 0;
    if (pct < 25) scoreRanges[0].count++;
    else if (pct < 50) scoreRanges[1].count++;
    else if (pct < 75) scoreRanges[2].count++;
    else scoreRanges[3].count++;
  });
  const studentIds = [...new Set(completed.map(s => s.studentId))];
  let topStudents: any[] = [];
  if (studentIds.length > 0) {
    const students = await db.select().from(usersTable).where(sql`id = ANY(${studentIds})`);
    const studentMap = Object.fromEntries(students.map(s => [s.id, s.name]));
    topStudents = completed
      .map(s => ({
        userId: s.studentId,
        name: studentMap[s.studentId] ?? "Aluno",
        score: parseFloat(String(s.score ?? 0)),
        percentage: s.score && s.maxScore ? parseFloat(String(s.score)) / parseFloat(String(s.maxScore)) * 100 : 0,
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((s, i) => ({ ...s, rank: i + 1 }));
  }
  res.json({
    examId: id, title: exam.title,
    totalSessions: sessions.length, completedSessions: completed.length,
    averageScore: avgScore, averageTimeMinutes,
    questionStats, scoreDistribution: scoreRanges, topStudents,
  });
});

export default router;
