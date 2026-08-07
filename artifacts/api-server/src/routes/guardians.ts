import { Router } from "express";
import { db, guardiansTable, studentGuardiansTable, usersTable, parentMessagesTable, schoolEventsTable, parentTipsTable, examSessionsTable, examsTable, subjectsTable, tenantsTable } from "@workspace/db";
import { eq, and, desc, inArray, sql, count } from "@workspace/db";
import { hashPassword, verifyPasswordLegacy, generateGuardianToken, verifyToken, requireAuth, requireRole } from "../lib/auth";
import { z } from "zod";

const router = Router();

function requireGuardianAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" }); return;
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded || !decoded.guardianId) {
    res.status(401).json({ error: "Invalid or expired token" }); return;
  }
  (req as any).guardianId = decoded.guardianId;
  (req as any).tenantId = decoded.tenantId;
  next();
}

function requireOwnGuardian(req: any, res: any, guardianId: number): boolean {
  if (req.guardianId !== guardianId) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

// GUARDIAN LOGIN (public, no auth required)
router.post("/guardians/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: "Missing email or password" }); return; }
  const [guardian] = await db.select().from(guardiansTable).where(eq(guardiansTable.email, email));
  if (!guardian || !(await verifyPasswordLegacy(password, guardian.passwordHash))) {
    res.status(401).json({ error: "Invalid credentials" }); return;
  }
  const token = generateGuardianToken(guardian.id, guardian.tenantId);
  res.json({ token, guardian: { id: guardian.id, name: guardian.name, email: guardian.email, tenantId: guardian.tenantId } });
});

// GUARDIAN ME
router.get("/guardians/me", requireGuardianAuth, async (req, res) => {
  const guardianId = (req as any).guardianId;
  const tenantId = (req as any).tenantId;
  const [guardian] = await db.select().from(guardiansTable)
    .where(and(eq(guardiansTable.id, guardianId), eq(guardiansTable.tenantId, tenantId)));
  if (!guardian) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: guardian.id, name: guardian.name, email: guardian.email, phone: guardian.phone, tenantId: guardian.tenantId });
});

// GUARDIAN'S STUDENTS
router.get("/guardians/:id/students", requireGuardianAuth, async (req, res) => {
  const guardianId = parseInt(req.params.id);
  if (!requireOwnGuardian(req, res, guardianId)) return;
  const tenantId = (req as any).tenantId;
  const [guardian] = await db.select().from(guardiansTable)
    .where(and(eq(guardiansTable.id, guardianId), eq(guardiansTable.tenantId, tenantId)));
  if (!guardian) { res.status(404).json({ error: "Not found" }); return; }
  const links = await db.select().from(studentGuardiansTable)
    .where(eq(studentGuardiansTable.guardianId, guardianId));
  const studentIds = links.map(l => l.studentId);
  if (studentIds.length === 0) { res.json([]); return; }
  const students = await db.select().from(usersTable).where(inArray(usersTable.id, studentIds));
  const result = students.map(s => {
    const { passwordHash, ...safe } = s;
    const link = links.find(l => l.studentId === s.id);
    return { ...safe, createdAt: safe.createdAt.toISOString(), updatedAt: safe.updatedAt.toISOString(), relation: link?.relation ?? "parent" };
  });
  res.json(result);
});

// GUARDIAN STATS (aggregated across all students)
router.get("/guardians/:id/stats", requireGuardianAuth, async (req, res) => {
  const guardianId = parseInt(req.params.id);
  if (!requireOwnGuardian(req, res, guardianId)) return;
  const tenantId = (req as any).tenantId;
  const [guardian] = await db.select().from(guardiansTable)
    .where(and(eq(guardiansTable.id, guardianId), eq(guardiansTable.tenantId, tenantId)));
  if (!guardian) { res.status(404).json({ error: "Not found" }); return; }
  const links = await db.select().from(studentGuardiansTable)
    .where(eq(studentGuardiansTable.guardianId, guardianId));
  const studentIds = links.map(l => l.studentId);
  if (studentIds.length === 0) {
    res.json({ totalExamsTaken: 0, averageScore: null, averagePercentage: null, bestScore: null, bySubject: [], byStudent: [], upcomingExams: [], recentSessions: [], messagesUnread: 0 });
    return;
  }

  const sessions = await db.select().from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(and(inArray(examSessionsTable.studentId, studentIds), eq(examsTable.tenantId, tenantId)));
  const completed = sessions.filter(s => s.exam_sessions.status === "submitted");
  const scores = completed.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
  const maxScores = completed.map(s => parseFloat(String(s.exam_sessions.maxScore ?? 10)));
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const bestScore = scores.length ? Math.max(...scores) : null;
  const percentages = scores.map((sc, i) => maxScores[i] > 0 ? (sc / maxScores[i]) * 100 : 0);
  const averagePercentage = percentages.length ? percentages.reduce((a, b) => a + b, 0) / percentages.length : null;

  // byStudent
  const byStudent: any[] = [];
  const students = await db.select().from(usersTable).where(inArray(usersTable.id, studentIds));
  for (const student of students) {
    const studentCompleted = completed.filter(s => s.exam_sessions.studentId === student.id);
    const studentScores = studentCompleted.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
    const studentMax = studentCompleted.map(s => parseFloat(String(s.exam_sessions.maxScore ?? 10)));
    const studentAvg = studentScores.length ? studentScores.reduce((a, b) => a + b, 0) / studentScores.length : null;
    const studentPct = studentScores.length ? studentScores.map((sc, i) => studentMax[i] > 0 ? (sc / studentMax[i]) * 100 : 0).reduce((a, b) => a + b, 0) / studentScores.length : null;
    byStudent.push({
      studentId: student.id,
      studentName: student.name,
      totalExams: studentCompleted.length,
      averageScore: studentAvg,
      averagePercentage: studentPct,
    });
  }

  // bySubject
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

  // recentSessions
  const recentSessions = completed.slice(-5).map(s => ({
    sessionId: s.exam_sessions.id,
    examId: s.exams.id,
    examTitle: s.exams.title,
    examType: s.exams.type,
    studentId: s.exam_sessions.studentId,
    score: s.exam_sessions.score ? parseFloat(String(s.exam_sessions.score)) : null,
    percentage: s.exam_sessions.score && s.exam_sessions.maxScore ? parseFloat(String(s.exam_sessions.score)) / parseFloat(String(s.exam_sessions.maxScore)) * 100 : null,
    submittedAt: s.exam_sessions.submittedAt?.toISOString() ?? null,
  }));

  // upcoming exams
  const upcomingExams = await db.select().from(examsTable)
    .where(and(
      eq(examsTable.tenantId, tenantId),
      eq(examsTable.status, "active"),
      sql`(${examsTable.startsAt} >= ${new Date().toISOString()} OR ${examsTable.classId} IS NULL)`,
    ))
    .orderBy(examsTable.startsAt);
  const upcoming = upcomingExams.slice(0, 5).map(e => ({
    id: e.id, title: e.title, type: e.type, startsAt: e.startsAt?.toISOString() ?? null, subjectId: e.subjectId, classId: e.classId,
  }));

  // messages unread
  const unreadCount = await db.select({ cnt: count() }).from(parentMessagesTable)
    .where(and(eq(parentMessagesTable.guardianId, guardianId), eq(parentMessagesTable.isRead, false)));

  res.json({
    totalExamsTaken: completed.length,
    averageScore: avgScore,
    averagePercentage,
    bestScore,
    byStudent,
    bySubject,
    recentSessions,
    upcomingExams: upcoming,
    messagesUnread: unreadCount[0]?.cnt ?? 0,
  });
});

// GUARDIAN MESSAGES
router.get("/guardians/:id/messages", requireGuardianAuth, async (req, res) => {
  const guardianId = parseInt(req.params.id);
  if (!requireOwnGuardian(req, res, guardianId)) return;
  const tenantId = (req as any).tenantId;
  const [guardian] = await db.select().from(guardiansTable)
    .where(and(eq(guardiansTable.id, guardianId), eq(guardiansTable.tenantId, tenantId)));
  if (!guardian) { res.status(404).json({ error: "Not found" }); return; }
  const messages = await db.select().from(parentMessagesTable)
    .where(eq(parentMessagesTable.guardianId, guardianId))
    .orderBy(desc(parentMessagesTable.createdAt));
  const senderIds = [...new Set(messages.map(m => m.senderId))];
  const senders = await db.select().from(usersTable).where(inArray(usersTable.id, senderIds));
  const senderMap = Object.fromEntries(senders.map(s => [s.id, s.name]));
  const result = messages.map(m => ({
    id: m.id, title: m.title, body: m.body, type: m.type, isRead: m.isRead,
    senderId: m.senderId, senderName: senderMap[m.senderId] ?? "Escola",
    studentId: m.studentId, createdAt: m.createdAt.toISOString(),
  }));
  res.json(result);
});

router.patch("/guardians/:id/messages/:msgId/read", requireGuardianAuth, async (req, res) => {
  const guardianId = parseInt(req.params.id);
  if (!requireOwnGuardian(req, res, guardianId)) return;
  const msgId = parseInt(req.params.msgId);
  const tenantId = (req as any).tenantId;
  // Verify message belongs to this guardian before marking read
  const [msg] = await db.select().from(parentMessagesTable)
    .where(and(eq(parentMessagesTable.id, msgId), eq(parentMessagesTable.guardianId, guardianId), eq(parentMessagesTable.tenantId, tenantId)));
  if (!msg) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.update(parentMessagesTable).set({ isRead: true }).where(eq(parentMessagesTable.id, msgId));
  res.json({ success: true });
});

// SEND MESSAGE (staff -> guardian)
router.post("/guardians/messages", requireAuth, requireRole("admin", "coordinator", "teacher"), async (req, res) => {
  const tenant = (req as any).tenant;
  const sender = (req as any).user;
  const parsed = z.object({
    guardianId: z.coerce.number().int().positive(),
    studentId: z.coerce.number().int().positive(),
    type: z.enum(["exam_alert", "exam_result", "activity_reminder", "general_tip", "custom_message"]).optional(),
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(5000),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() }); return; }
  const { guardianId, studentId, type, title, body } = parsed.data;
  const [guardian] = await db.select({ id: guardiansTable.id }).from(guardiansTable)
    .where(and(eq(guardiansTable.id, guardianId), eq(guardiansTable.tenantId, tenant.id)));
  const [student] = await db.select({ id: usersTable.id, role: usersTable.role }).from(usersTable)
    .where(and(eq(usersTable.id, studentId), eq(usersTable.tenantId, tenant.id), eq(usersTable.role, "student")));
  const [link] = await db.select({ id: studentGuardiansTable.id }).from(studentGuardiansTable)
    .where(and(eq(studentGuardiansTable.guardianId, guardianId), eq(studentGuardiansTable.studentId, studentId)));
  if (!guardian || !student || !link) { res.status(404).json({ error: "Responsável ou aluno não encontrado nesta instituição" }); return; }
  const [msg] = await db.insert(parentMessagesTable).values({
    tenantId: tenant.id, guardianId, studentId, senderId: sender.id,
    type: type || "custom_message", title, body, isRead: false,
  }).returning();
  res.status(201).json({ ...msg, createdAt: msg.createdAt.toISOString() });
});

// SCHOOL EVENTS
router.get("/guardians/events", requireGuardianAuth, async (req, res) => {
  const tenantId = (req as any).tenantId;
  const events = await db.select().from(schoolEventsTable)
    .where(eq(schoolEventsTable.tenantId, tenantId))
    .orderBy(schoolEventsTable.startsAt);
  res.json(events.map(e => ({ ...e, startsAt: e.startsAt.toISOString(), endsAt: e.endsAt?.toISOString() ?? null, createdAt: e.createdAt.toISOString() })));
});

// PARENT TIPS
router.get("/guardians/tips", requireGuardianAuth, async (req, res) => {
  const tenantId = (req as any).tenantId;
  const tips = await db.select().from(parentTipsTable)
    .where(eq(parentTipsTable.tenantId, tenantId))
    .orderBy(desc(parentTipsTable.createdAt));
  res.json(tips.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })));
});

// CRUD GUARDIANS (for admin/coordinator)
router.get("/guardians", requireAuth, requireRole("admin", "coordinator"), async (req, res) => {
  const tenant = (req as any).tenant;
  const guardians = await db.select().from(guardiansTable).where(eq(guardiansTable.tenantId, tenant.id));
  res.json(guardians.map(g => ({ id: g.id, name: g.name, email: g.email, phone: g.phone, createdAt: g.createdAt.toISOString() })));
});

router.post("/guardians", requireAuth, requireRole("admin", "coordinator"), async (req, res) => {
  const tenant = (req as any).tenant;
  const parsed = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(128),
    phone: z.string().trim().max(40).optional().nullable(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() }); return; }
  const { name, email, password, phone } = parsed.data;
  const [existing] = await db.select({ id: guardiansTable.id }).from(guardiansTable)
    .where(and(eq(guardiansTable.tenantId, tenant.id), eq(guardiansTable.email, email)));
  if (existing) { res.status(409).json({ error: "Já existe um responsável com este e-mail" }); return; }
  const [guardian] = await db.insert(guardiansTable).values({
    tenantId: tenant.id, name, email, phone,
    passwordHash: await hashPassword(password),
  }).returning();
  res.status(201).json({ id: guardian.id, name: guardian.name, email: guardian.email, phone: guardian.phone, createdAt: guardian.createdAt.toISOString() });
});

router.put("/guardians/:guardianId", requireAuth, requireRole("admin", "coordinator"), async (req, res) => {
  const tenant = (req as any).tenant;
  const guardianId = parseInt(req.params.guardianId as string);
  const parsed = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().max(40).optional().nullable(),
  }).safeParse(req.body);
  if (!Number.isInteger(guardianId) || !parsed.success) { res.status(400).json({ error: "Dados inválidos" }); return; }
  const { name, email, phone } = parsed.data;
  const [duplicate] = await db.select({ id: guardiansTable.id }).from(guardiansTable)
    .where(and(eq(guardiansTable.tenantId, tenant.id), eq(guardiansTable.email, email)));
  if (duplicate && duplicate.id !== guardianId) { res.status(409).json({ error: "Já existe um responsável com este e-mail" }); return; }
  const [guardian] = await db.update(guardiansTable)
    .set({ name, email, phone, updatedAt: new Date() })
    .where(and(eq(guardiansTable.id, guardianId), eq(guardiansTable.tenantId, tenant.id)))
    .returning();
  if (!guardian) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: guardian.id, name: guardian.name, email: guardian.email, phone: guardian.phone, createdAt: guardian.createdAt.toISOString() });
});

router.delete("/guardians/:guardianId", requireAuth, requireRole("admin", "coordinator"), async (req, res) => {
  const tenant = (req as any).tenant;
  const guardianId = parseInt(req.params.guardianId as string);
  await db.delete(guardiansTable).where(and(eq(guardiansTable.id, guardianId), eq(guardiansTable.tenantId, tenant.id)));
  res.json({ success: true });
});

router.post("/guardians/:guardianId/students", requireAuth, requireRole("admin", "coordinator"), async (req, res) => {
  const tenant = (req as any).tenant;
  const guardianId = parseInt(req.params.guardianId as string);
  const parsed = z.object({
    studentId: z.coerce.number().int().positive(),
    relation: z.enum(["parent", "stepparent", "grandparent", "guardian", "other"]).optional(),
  }).safeParse(req.body);
  if (!Number.isInteger(guardianId) || !parsed.success) { res.status(400).json({ error: "Dados inválidos" }); return; }
  const { studentId, relation } = parsed.data;
  const [guardian] = await db.select().from(guardiansTable).where(and(eq(guardiansTable.id, guardianId), eq(guardiansTable.tenantId, tenant.id)));
  if (!guardian) { res.status(404).json({ error: "Guardian not found" }); return; }
  const [student] = await db.select().from(usersTable).where(and(eq(usersTable.id, studentId), eq(usersTable.tenantId, tenant.id)));
  if (!student || student.role !== "student") { res.status(404).json({ error: "Student not found" }); return; }
  await db.insert(studentGuardiansTable).values({
    studentId, guardianId, relation: relation || "parent",
  }).onConflictDoNothing();
  res.json({ success: true });
});

export default router;
