import { Router } from "express";
import { db, usersTable, examSessionsTable, examsTable, subjectsTable, questionsTable, studentAnswersTable } from "@workspace/db";
import { eq, and, sql, ilike, avg, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { hashPassword } from "../lib/auth";

const router = Router();
router.use(requireAuth);

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

router.post("/", async (req, res) => {
  const tenant = (req as any).tenant;
  const { name, email, password, role, registrationNumber, classId } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    tenantId: tenant.id,
    name,
    email,
    passwordHash: hashPassword(password),
    role,
    registrationNumber,
  }).returning();
  res.status(201).json(serializeUser(user));
});

router.get("/:userId", async (req, res) => {
  const tenant = (req as any).tenant;
  const userId = parseInt(req.params.userId);
  const [user] = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.tenantId, tenant.id)));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeUser(user));
});

router.put("/:userId", async (req, res) => {
  const tenant = (req as any).tenant;
  const userId = parseInt(req.params.userId);
  const { name, email, role, registrationNumber } = req.body;
  const [user] = await db.update(usersTable)
    .set({ name, email, role, registrationNumber, updatedAt: new Date() })
    .where(and(eq(usersTable.id, userId), eq(usersTable.tenantId, tenant.id)))
    .returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeUser(user));
});

router.delete("/:userId", async (req, res) => {
  const tenant = (req as any).tenant;
  const userId = parseInt(req.params.userId);
  await db.delete(usersTable).where(and(eq(usersTable.id, userId), eq(usersTable.tenantId, tenant.id)));
  res.json({ success: true });
});

router.get("/:userId/stats", async (req, res) => {
  const tenant = (req as any).tenant;
  const userId = parseInt(req.params.userId);
  const sessions = await db.select().from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(and(eq(examSessionsTable.studentId, userId), eq(examsTable.tenantId, tenant.id)));

  const completed = sessions.filter(s => s.exam_sessions.status === "submitted");
  const scores = completed.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const bestScore = scores.length ? Math.max(...scores) : null;

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
    bestScore,
    bySubject: [],
    recentSessions,
  });
});

export default router;
