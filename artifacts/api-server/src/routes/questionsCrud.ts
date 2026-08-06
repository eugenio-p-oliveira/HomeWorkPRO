import { Router } from "express";
import { db, questionsTable, questionOptionsTable, examsTable } from "@workspace/db";
import { eq, and } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router = Router();
router.use(requireAuth);

router.put("/:questionId", async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(req.params.questionId);
  const { type, statement, explanation, topicId, points, order, options } = req.body;
  const [q] = await db.update(questionsTable).set({ type, statement, explanation, topicId, points: Number(points ?? 1), order })
    .where(eq(questionsTable.id, id)).returning();
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  // Verify question belongs to a tenant-owned exam
  const [exam] = await db.select().from(examsTable)
    .where(and(eq(examsTable.id, q.examId), eq(examsTable.tenantId, tenant.id)));
  if (!exam) { res.status(403).json({ error: "Forbidden" }); return; }
  if (options?.length > 0) {
    await db.delete(questionOptionsTable).where(eq(questionOptionsTable.questionId, id));
    await db.insert(questionOptionsTable).values(
      options.map((o: any) => ({ questionId: id, text: o.text, isCorrect: o.isCorrect, letter: o.letter }))
    );
  }
  const updatedOptions = await db.select().from(questionOptionsTable).where(eq(questionOptionsTable.questionId, id));
  res.json({ ...q, points: parseFloat(String(q.points)), createdAt: q.createdAt.toISOString(), options: updatedOptions });
});

router.delete("/:questionId", async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(req.params.questionId);
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
