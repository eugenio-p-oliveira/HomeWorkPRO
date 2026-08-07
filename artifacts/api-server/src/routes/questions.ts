import { Router } from "express";
import { db, questionsTable, questionOptionsTable, examsTable } from "@workspace/db";
import { eq, and, inArray } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { z } from "zod";

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
const questionSchema = z.object({
  type: z.enum(["multiple_choice", "true_false"]),
  statement: z.string().trim().min(2).max(10000),
  explanation: z.string().trim().max(5000).optional().nullable(),
  topicId: z.coerce.number().int().positive().optional().nullable(),
  points: z.coerce.number().positive().max(100).optional(),
  order: z.coerce.number().int().min(0).max(10000).optional(),
  options: z.array(z.object({
    text: z.string().trim().min(1).max(1000),
    isCorrect: z.boolean(),
    letter: z.string().trim().min(1).max(3),
  })).max(20).optional(),
});

router.post("/", requireRole("admin", "coordinator", "teacher"), async (req, res) => {
  const examId = getExamId(req);
  const tenant = (req as any).tenant;
  const [exam] = await db.select().from(examsTable).where(and(eq(examsTable.id, examId), eq(examsTable.tenantId, tenant.id)));
  if (!exam) { res.status(404).json({ error: "Not found" }); return; }
  const parsed = questionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() }); return; }
  const { type, statement, explanation, topicId, points, order, options } = parsed.data;
  if (topicId) {
    const { topicsTable, subjectsTable } = await import("@workspace/db");
    const [topic] = await db.select({ id: topicsTable.id }).from(topicsTable)
      .innerJoin(subjectsTable, eq(topicsTable.subjectId, subjectsTable.id))
      .where(and(eq(topicsTable.id, topicId), eq(subjectsTable.tenantId, tenant.id)));
    if (!topic) { res.status(400).json({ error: "Tópico inválido" }); return; }
  }
  if (type === "multiple_choice" && (!options || options.length < 2 || options.filter((option: { isCorrect: boolean }) => option.isCorrect).length !== 1)) {
    res.status(400).json({ error: "Questões de múltipla escolha precisam de pelo menos duas opções e uma resposta correta" }); return;
  }
  const [q] = await db.insert(questionsTable).values({
    examId, type, statement, explanation, topicId,
    points: Number(points ?? 1), order,
  }).returning();
  let createdOptions: any[] = [];
  if (options && options.length > 0) {
    createdOptions = await db.insert(questionOptionsTable).values(
      options.map((o: any) => ({ questionId: q.id, text: o.text, isCorrect: o.isCorrect, letter: o.letter }))
    ).returning();
  }
  res.status(201).json({ ...q, points: parseFloat(String(q.points)), createdAt: q.createdAt.toISOString(), options: createdOptions });
});

export default router;
