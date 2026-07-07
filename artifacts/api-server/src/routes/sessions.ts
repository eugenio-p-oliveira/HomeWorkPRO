import { Router } from "express";
import {
  db, examsTable, examSessionsTable, studentAnswersTable, questionsTable,
  questionOptionsTable, classStudentsTable, activityLogTable
} from "@workspace/db";
import { eq, and, sql, count, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();
router.use(requireAuth);

async function buildSessionResult(sessionId: number) {
  const [session] = await db.select().from(examSessionsTable).where(eq(examSessionsTable.id, sessionId));
  if (!session) return null;
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, session.examId));
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, session.examId)).orderBy(questionsTable.order);
  const qIds = questions.map(q => q.id);
  const options = qIds.length > 0
    ? await db.select().from(questionOptionsTable).where(inArray(questionOptionsTable.questionId, qIds))
    : [];
  const answers = await db.select().from(studentAnswersTable).where(eq(studentAnswersTable.sessionId, sessionId));
  const answerMap = Object.fromEntries(answers.map(a => [a.questionId, a]));
  const correctOpts = Object.fromEntries(options.filter(o => o.isCorrect).map(o => [o.questionId, o.id]));
  const questionResults = questions.map(q => ({
    questionId: q.id,
    selectedOptionId: answerMap[q.id]?.selectedOptionId ?? null,
    correctOptionId: correctOpts[q.id] ?? 0,
    isCorrect: answerMap[q.id]?.isCorrect ?? false,
    explanation: q.explanation ?? null,
    points: parseFloat(String(q.points)),
  }));
  const score = parseFloat(String(session.score ?? 0));
  const maxScore = parseFloat(String(session.maxScore ?? 0));
  const timeMs = session.submittedAt ? session.submittedAt.getTime() - session.startedAt.getTime() : null;
  return {
    sessionId: session.id,
    examId: session.examId,
    score,
    maxScore,
    percentage: maxScore > 0 ? (score / maxScore) * 100 : 0,
    totalQuestions: questions.length,
    correctAnswers: questionResults.filter(r => r.isCorrect).length,
    timeSpentMinutes: timeMs ? timeMs / 60000 : null,
    submittedAt: session.submittedAt?.toISOString() ?? new Date().toISOString(),
    questionResults,
  };
}

router.get("/student/exams", async (req, res) => {
  const user = (req as any).user;
  const tenant = (req as any).tenant;
  const now = new Date();
  const allExams = await db.select().from(examsTable)
    .where(sql`tenant_id = ${tenant.id} AND (status = 'active' OR status = 'scheduled' OR status = 'closed')`);
  const myEnrollments = await db.select({ classId: classStudentsTable.classId })
    .from(classStudentsTable).where(eq(classStudentsTable.studentId, user.id));
  const enrolledClassIds = myEnrollments.map(e => e.classId);
  const accessible = allExams.filter(e =>
    e.isPublic || (e.classId && enrolledClassIds.includes(e.classId))
  );
  const mySessions = await db.select().from(examSessionsTable).where(eq(examSessionsTable.studentId, user.id));
  const sessionByExam = Object.fromEntries(mySessions.map(s => [s.examId, s]));
  const available = accessible.filter(e => {
    const session = sessionByExam[e.id];
    const isActive = e.status === "active" || (e.status === "scheduled" && e.startsAt && e.startsAt <= now && (!e.endsAt || e.endsAt >= now));
    return isActive && !session;
  });
  const completed = mySessions.filter(s => s.status === "submitted").map(s => {
    const exam = allExams.find(e => e.id === s.examId);
    return {
      sessionId: s.id,
      examId: s.examId,
      examTitle: exam?.title ?? "Prova",
      examType: exam?.type ?? "traditional",
      score: s.score ? parseFloat(String(s.score)) : null,
      percentage: s.score && s.maxScore ? parseFloat(String(s.score)) / parseFloat(String(s.maxScore)) * 100 : null,
      submittedAt: s.submittedAt?.toISOString() ?? null,
      status: s.status,
    };
  });
  const upcoming = accessible.filter(e => e.startsAt && e.startsAt > now && !sessionByExam[e.id]);
  const formatExam = (e: any) => ({
    ...e, questionsCount: 0, createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString(),
    startsAt: e.startsAt?.toISOString() ?? null, endsAt: e.endsAt?.toISOString() ?? null,
  });
  res.json({ available: available.map(formatExam), completed, upcoming: upcoming.map(formatExam) });
});

router.post("/student/exams/:examId/start", async (req, res) => {
  const user = (req as any).user;
  const tenant = (req as any).tenant;
  const examId = parseInt(req.params.examId);
  // Verify user is a student
  if (user.role !== "student") { res.status(403).json({ error: "Only students can start exams" }); return; }
  const [exam] = await db.select().from(examsTable).where(and(eq(examsTable.id, examId), eq(examsTable.tenantId, tenant.id)));
  if (!exam) { res.status(404).json({ error: "Not found" }); return; }
  const existing = await db.select().from(examSessionsTable)
    .where(and(eq(examSessionsTable.examId, examId), eq(examSessionsTable.studentId, user.id)));
  const inProgress = existing.find(s => s.status === "in_progress");
  if (inProgress) {
    const examDetail = await buildSessionExamDetail(examId, inProgress);
    res.json(examDetail);
    return;
  }
  const now = new Date();
  const endsAt = exam.timeLimitMinutes ? new Date(now.getTime() + exam.timeLimitMinutes * 60000) : null;
  const [session] = await db.insert(examSessionsTable).values({
    examId, studentId: user.id, endsAt, status: "in_progress",
  }).returning();
  const examDetail = await buildSessionExamDetail(examId, session);
  res.json(examDetail);
});

async function buildSessionExamDetail(examId: number, session: any) {
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, examId)).orderBy(questionsTable.order);
  const qIds = questions.map(q => q.id);
  const options = qIds.length > 0
    ? await db.select().from(questionOptionsTable).where(inArray(questionOptionsTable.questionId, qIds))
    : [];
  const optsByQ: Record<number, any[]> = {};
  options.forEach(o => { if (!optsByQ[o.questionId]) optsByQ[o.questionId] = []; optsByQ[o.questionId].push(o); });
  const answers = await db.select().from(studentAnswersTable).where(eq(studentAnswersTable.sessionId, session.id));
  return {
    id: session.id, examId: session.examId, studentId: session.studentId,
    startedAt: session.startedAt.toISOString(), endsAt: session.endsAt?.toISOString() ?? null,
    status: session.status, answeredCount: answers.length,
    exam: {
      ...exam, questionsCount: questions.length,
      createdAt: exam.createdAt.toISOString(), updatedAt: exam.updatedAt.toISOString(),
      startsAt: exam.startsAt?.toISOString() ?? null, endsAt: exam.endsAt?.toISOString() ?? null,
      questions: questions.map(q => ({
        ...q, points: parseFloat(String(q.points)), createdAt: q.createdAt.toISOString(),
        options: (optsByQ[q.id] ?? []).map((o: any) => ({ ...o, isCorrect: false })),
      })),
    },
  };
}

router.post("/student/sessions/:sessionId/answer", async (req, res) => {
  const user = (req as any).user;
  const sessionId = parseInt(req.params.sessionId);
  const { questionId, selectedOptionId } = req.body;
  const [session] = await db.select().from(examSessionsTable)
    .where(and(eq(examSessionsTable.id, sessionId), eq(examSessionsTable.studentId, user.id)));
  if (!session || session.status !== "in_progress") { res.status(400).json({ error: "Session not active" }); return; }
  let isCorrect = false;
  if (selectedOptionId) {
    const [opt] = await db.select().from(questionOptionsTable).where(eq(questionOptionsTable.id, selectedOptionId));
    isCorrect = opt?.isCorrect ?? false;
  }
  const existing = await db.select().from(studentAnswersTable)
    .where(and(eq(studentAnswersTable.sessionId, sessionId), eq(studentAnswersTable.questionId, questionId)));
  if (existing.length > 0) {
    await db.update(studentAnswersTable).set({ selectedOptionId, isCorrect, updatedAt: new Date() })
      .where(and(eq(studentAnswersTable.sessionId, sessionId), eq(studentAnswersTable.questionId, questionId)));
  } else {
    await db.insert(studentAnswersTable).values({ sessionId, questionId, selectedOptionId, isCorrect });
  }
  res.json({ success: true });
});

router.post("/student/sessions/:sessionId/submit", async (req, res) => {
  const user = (req as any).user;
  const tenant = (req as any).tenant;
  const sessionId = parseInt(req.params.sessionId);
  const [session] = await db.select().from(examSessionsTable)
    .where(and(eq(examSessionsTable.id, sessionId), eq(examSessionsTable.studentId, user.id)));
  if (!session) { res.status(404).json({ error: "Not found" }); return; }
  if (session.status === "submitted") {
    const result = await buildSessionResult(sessionId);
    res.json(result); return;
  }
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, session.examId));
  const maxScore = questions.reduce((sum, q) => sum + parseFloat(String(q.points)), 0);
  const answers = await db.select().from(studentAnswersTable).where(eq(studentAnswersTable.sessionId, sessionId));
  const correctAnswers = answers.filter(a => a.isCorrect);
  const score = correctAnswers.reduce((sum, a) => {
    const q = questions.find(q => q.id === a.questionId);
    return sum + (q ? parseFloat(String(q.points)) : 0);
  }, 0);
  await db.update(examSessionsTable).set({
    status: "submitted", submittedAt: new Date(),
    score: String(score), maxScore: String(maxScore),
  }).where(eq(examSessionsTable.id, sessionId));
  await db.insert(activityLogTable).values({
    tenantId: tenant.id, userId: user.id,
    type: "exam_submitted", description: `Prova submetida`,
  }).catch(() => {});
  const result = await buildSessionResult(sessionId);
  res.json(result);
});

router.get("/student/sessions/:sessionId/result", async (req, res) => {
  const user = (req as any).user;
  const sessionId = parseInt(req.params.sessionId);
  const [session] = await db.select().from(examSessionsTable)
    .where(and(eq(examSessionsTable.id, sessionId), eq(examSessionsTable.studentId, user.id)));
  if (!session) { res.status(404).json({ error: "Not found" }); return; }
  const result = await buildSessionResult(sessionId);
  res.json(result);
});

export default router;
