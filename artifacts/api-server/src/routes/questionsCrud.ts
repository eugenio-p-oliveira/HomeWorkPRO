import { Router } from "express";
import { db, questionsTable, questionOptionsTable, examsTable } from "@workspace/db";
import { eq, and } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const updateQuestionSchema = z.object({
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

router.put("/:questionId", requireRole("admin", "coordinator", "teacher"), async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(String(req.params.questionId));
  const parsed = updateQuestionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() }); return; }
  const { type, statement, explanation, topicId, points, order, options } = parsed.data;
  const [existing] = await db.select().from(questionsTable).where(eq(questionsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  // Verify question belongs to a tenant-owned exam before mutating it.
  const [exam] = await db.select().from(examsTable)
    .where(and(eq(examsTable.id, existing.examId), eq(examsTable.tenantId, tenant.id)));
  if (!exam) { res.status(403).json({ error: "Forbidden" }); return; }
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
  const [q] = await db.update(questionsTable).set({ type, statement, explanation, topicId, points: Number(points ?? 1), order })
    .where(eq(questionsTable.id, id)).returning();
  if (options && options.length > 0) {
    await db.delete(questionOptionsTable).where(eq(questionOptionsTable.questionId, id));
    await db.insert(questionOptionsTable).values(
      options.map((o: any) => ({ questionId: id, text: o.text, isCorrect: o.isCorrect, letter: o.letter }))
    );
  }
  const updatedOptions = await db.select().from(questionOptionsTable).where(eq(questionOptionsTable.questionId, id));
  res.json({ ...q, points: parseFloat(String(q.points)), createdAt: q.createdAt.toISOString(), options: updatedOptions });
});

router.delete("/:questionId", requireRole("admin", "coordinator", "teacher"), async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(String(req.params.questionId));
  // Verify question belongs to tenant before deleting
  const [q] = await db.select().from(questionsTable).where(eq(questionsTable.id, id));
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  const [exam] = await db.select().from(examsTable)
    .where(and(eq(examsTable.id, q.examId), eq(examsTable.tenantId, tenant.id)));
  if (!exam) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(questionsTable).where(eq(questionsTable.id, id));
  res.json({ success: true });
});

export default router;
