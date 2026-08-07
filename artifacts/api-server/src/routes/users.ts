import { Router } from "express";
import { db, usersTable, examSessionsTable, examsTable, subjectsTable, questionsTable, studentAnswersTable } from "@workspace/db";
import { eq, and, sql, ilike, avg, count, inArray } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { hashPassword } from "../lib/auth";
import { z } from "zod";

const router = Router();
router.use(requireAuth);
router.use(requireRole("admin", "coordinator", "teacher"));

function serializeUser(u: any) {
  const { passwordHash: _, ...safe } = u;
  return { ...safe, createdAt: safe.createdAt.toISOString(), updatedAt: safe.updatedAt.toISOString() };
}

router.get("/", async (req, res) => {
  const tenant = (req as any).tenant;
  const { role, classId, search } = req.query as any;
  let query: any = db.select().from(usersTable).where(eq(usersTable.tenantId, tenant.id));
  const conditions = [eq(usersTable.tenantId, tenant.id)];
  if (role) conditions.push(eq(usersTable.role, role as any));
  if (search) conditions.push(ilike(usersTable.name, `%${search}%`));
  const users = await db.select().from(usersTable).where(and(...conditions));
  res.json(users.map(serializeUser));
});

const userInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(["admin", "coordinator", "teacher", "student"]),
  registrationNumber: z.string().trim().max(80).optional().nullable(),
});

router.post("/", requireRole("admin", "coordinator"), async (req, res) => {
  const tenant = (req as any).tenant;
  const actor = (req as any).user;
  const parsed = userInputSchema.extend({ password: z.string().min(8).max(128) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    return;
  }
  const { name, email, password, role, registrationNumber } = parsed.data;
  if (role === "admin" && actor.role !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem criar administradores" });
    return;
  }
  const [existing] = await db.select({ id: usersTable.id }).from(usersTable)
    .where(and(eq(usersTable.tenantId, tenant.id), eq(usersTable.email, email)));
  if (existing) {
    res.status(409).json({ error: "Já existe um usuário com este e-mail nesta instituição" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    tenantId: tenant.id,
    name,
    email,
    passwordHash: await hashPassword(password),
    role,
    registrationNumber,
  }).returning();
  res.status(201).json(serializeUser(user));
});

router.get("/:userId", async (req, res) => {
  const tenant = (req as any).tenant;
  const userId = parseInt(String(req.params.userId));
  const [user] = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.tenantId, tenant.id)));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeUser(user));
});

router.put("/:userId", requireRole("admin", "coordinator"), async (req, res) => {
  const tenant = (req as any).tenant;
  const actor = (req as any).user;
  const userId = parseInt(String(req.params.userId));
  if (!Number.isInteger(userId)) { res.status(400).json({ error: "ID inválido" }); return; }
  const parsed = userInputSchema.omit({ password: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    return;
  }
  const { name, email, role, registrationNumber } = parsed.data;
  const [target] = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.tenantId, tenant.id)));
  if (!target) { res.status(404).json({ error: "Not found" }); return; }
  if (target.role === "admin" && actor.role !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem alterar administradores" });
    return;
  }
  if (role === "admin" && actor.role !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem atribuir este papel" });
    return;
  }
  if (target.id === actor.id && role !== actor.role) {
    res.status(400).json({ error: "Você não pode remover seu próprio papel administrativo" });
    return;
  }
  const [user] = await db.update(usersTable)
    .set({ name, email, role, registrationNumber, updatedAt: new Date() })
    .where(and(eq(usersTable.id, userId), eq(usersTable.tenantId, tenant.id)))
    .returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeUser(user));
});

router.delete("/:userId", requireRole("admin", "coordinator"), async (req, res) => {
  const tenant = (req as any).tenant;
  const actor = (req as any).user;
  const userId = parseInt(String(req.params.userId));
  if (!Number.isInteger(userId)) { res.status(400).json({ error: "ID inválido" }); return; }
  const [target] = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.tenantId, tenant.id)));
  if (!target) { res.status(404).json({ error: "Not found" }); return; }
  if (target.id === actor.id) { res.status(400).json({ error: "Você não pode excluir sua própria conta" }); return; }
  if (target.role === "admin" && actor.role !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem excluir administradores" });
    return;
  }
  await db.delete(usersTable).where(and(eq(usersTable.id, userId), eq(usersTable.tenantId, tenant.id)));
  res.json({ success: true });
});

router.get("/:userId/stats", async (req, res) => {
  const tenant = (req as any).tenant;
  const userId = parseInt(req.params.userId);
  if (!Number.isInteger(userId)) { res.status(400).json({ error: "ID inválido" }); return; }
  const [student] = await db.select({ id: usersTable.id, role: usersTable.role }).from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.tenantId, tenant.id)));
  if (!student || student.role !== "student") { res.status(404).json({ error: "Aluno não encontrado" }); return; }
  const sessions = await db.select().from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(and(eq(examSessionsTable.studentId, userId), eq(examsTable.tenantId, tenant.id)))
    .orderBy(examSessionsTable.submittedAt);

  const completed = sessions.filter(s => s.exam_sessions.status === "submitted");
  const scores = completed.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
  const maxScores = completed.map(s => parseFloat(String(s.exam_sessions.maxScore ?? 10)));
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const bestScore = scores.length ? Math.max(...scores) : null;
  const percentages = scores.map((sc, i) => maxScores[i] > 0 ? (sc / maxScores[i]) * 100 : 0);
  const averagePercentage = percentages.length ? percentages.reduce((a, b) => a + b, 0) / percentages.length : null;

  // bySubject breakdown
  const subjectScores: Record<number, { name: string; color: string | null; scores: number[]; pcts: number[] }> = {};
  for (const row of completed) {
    const subId = row.exams.subjectId;
    if (!subId) continue;
    if (!subjectScores[subId]) subjectScores[subId] = { name: "", color: null, scores: [], pcts: [] };
    const sc = parseFloat(String(row.exam_sessions.score ?? 0));
    const mx = parseFloat(String(row.exam_sessions.maxScore ?? 10));
    subjectScores[subId].scores.push(mx > 0 ? (sc / mx) * 10 : 0);
    subjectScores[subId].pcts.push(mx > 0 ? (sc / mx) * 100 : 0);
  }
  const subIds = Object.keys(subjectScores).map(Number);
  if (subIds.length > 0) {
    const subs = await db.select().from(subjectsTable).where(inArray(subjectsTable.id, subIds));
    subs.forEach(s => { if (subjectScores[s.id]) { subjectScores[s.id].name = s.name; subjectScores[s.id].color = s.color ?? null; } });
  }
  const bySubject = Object.entries(subjectScores).map(([subId, data]) => ({
    subjectId: parseInt(subId), subjectName: data.name, color: data.color,
    averageScore: data.scores.length ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : null,
    averagePercentage: data.pcts.length ? data.pcts.reduce((a, b) => a + b, 0) / data.pcts.length : null,
    totalAttempts: data.scores.length,
  }));

  // Timeline: all completed sessions with dates
  const timeline = completed.map(s => ({
    sessionId: s.exam_sessions.id,
    examId: s.exams.id,
    examTitle: s.exams.title,
    examType: s.exams.type,
    subjectId: s.exams.subjectId,
    score: parseFloat(String(s.exam_sessions.score ?? 0)),
    maxScore: parseFloat(String(s.exam_sessions.maxScore ?? 10)),
    percentage: s.exam_sessions.maxScore ? parseFloat(String(s.exam_sessions.score ?? 0)) / parseFloat(String(s.exam_sessions.maxScore)) * 100 : 0,
    submittedAt: s.exam_sessions.submittedAt?.toISOString() ?? null,
  }));

  // Recent sessions with detail
  const recentSessions = completed.slice(-5).map(s => ({
    sessionId: s.exam_sessions.id,
    examId: s.exams.id,
    examTitle: s.exams.title,
    examType: s.exams.type,
    score: s.exam_sessions.score ? parseFloat(String(s.exam_sessions.score)) : null,
    percentage: s.exam_sessions.score && s.exam_sessions.maxScore
      ? parseFloat(String(s.exam_sessions.score)) / parseFloat(String(s.exam_sessions.maxScore)) * 100
      : null,
    submittedAt: s.exam_sessions.submittedAt?.toISOString() ?? null,
    status: s.exam_sessions.status,
  }));

  res.json({
    userId,
    totalExamsTaken: completed.length,
    averageScore: avgScore,
    averagePercentage,
    bestScore,
    bySubject,
    timeline,
    recentSessions,
  });
});

export default router;
