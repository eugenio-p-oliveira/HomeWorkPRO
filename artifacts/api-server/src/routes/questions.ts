import { Router } from "express";
import { db, questionsTable, questionOptionsTable, examsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router({ mergeParams: true });
router.use(requireAuth);

function getExamId(req: any) {
  return parseInt(req.params.examId as string);
}

// GET /api/exams/:examId/questions
router.get("/", async (req, res) => {
  const examId = getExamId(req);
  const tenant = (req as any).tenant;
  const [exam] = await db.select().from(examsTable).where(and(eq(examsTable.id, examId), eq(examsTable.tenantId, tenant.id)));
  if (!exam) { res.status(404).json({ error: "Not found" }); return; }
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, examId)).orderBy(questionsTable.order);
  const qIds = questions.map(q => q.id);
  let options: any[] = [];
  if (qIds.length > 0) {
    options = await db.select().from(questionOptionsTable).where(inArray(questionOptionsTable.questionId, qIds));
  }
  const optsByQ: Record<number, any[]> = {};
  options.forEach(o => { if (!optsByQ[o.questionId]) optsByQ[o.questionId] = []; optsByQ[o.questionId].push(o); });
  res.json(questions.map(q => ({
    ...q, points: parseFloat(String(q.points)), createdAt: q.createdAt.toISOString(),
    options: optsByQ[q.id] ?? [],
  })));
});

// POST /api/exams/:examId/questions
router.post("/", async (req, res) => {
  const examId = getExamId(req);
  const tenant = (req as any).tenant;
  const [exam] = await db.select().from(examsTable).where(and(eq(examsTable.id, examId), eq(examsTable.tenantId, tenant.id)));
  if (!exam) { res.status(404).json({ error: "Not found" }); return; }
  const { type, statement, explanation, topicId, points, order, options } = req.body;
  const [q] = await db.insert(questionsTable).values({
    examId, type, statement, explanation, topicId,
    points: String(points ?? 1), order,
  }).returning();
  let createdOptions: any[] = [];
  if (options?.length > 0) {
    createdOptions = await db.insert(questionOptionsTable).values(
      options.map((o: any) => ({ questionId: q.id, text: o.text, isCorrect: o.isCorrect, letter: o.letter }))
    ).returning();
  }
  res.status(201).json({ ...q, points: parseFloat(String(q.points)), createdAt: q.createdAt.toISOString(), options: createdOptions });
});

export default router;
