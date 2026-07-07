import { Router } from "express";
import {
  db, subjectsTable, topicsTable, seriesTable, classesTable, classStudentsTable, usersTable,
  examSessionsTable, examsTable, studentAnswersTable, questionsTable
} from "@workspace/db";
import { eq, and, count, avg, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();
router.use(requireAuth);

// SUBJECTS
router.get("/subjects", async (req, res) => {
  const tenant = (req as any).tenant;
  const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.tenantId, tenant.id));
  const topicCounts = await db.select({ subjectId: topicsTable.subjectId, cnt: count() })
    .from(topicsTable)
    .innerJoin(subjectsTable, eq(topicsTable.subjectId, subjectsTable.id))
    .where(eq(subjectsTable.tenantId, tenant.id))
    .groupBy(topicsTable.subjectId);
  const countMap = Object.fromEntries(topicCounts.map(t => [t.subjectId, Number(t.cnt)]));
  res.json(subjects.map(s => ({ ...s, topicsCount: countMap[s.id] ?? 0, createdAt: s.createdAt.toISOString() })));
});

router.post("/subjects", async (req, res) => {
  const tenant = (req as any).tenant;
  const { name, color } = req.body;
  const [s] = await db.insert(subjectsTable).values({ tenantId: tenant.id, name, color }).returning();
  res.status(201).json({ ...s, topicsCount: 0, createdAt: s.createdAt.toISOString() });
});

router.put("/subjects/:id", async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(req.params.id);
  const { name, color } = req.body;
  const [s] = await db.update(subjectsTable).set({ name, color }).where(and(eq(subjectsTable.id, id), eq(subjectsTable.tenantId, tenant.id))).returning();
  if (!s) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...s, topicsCount: 0, createdAt: s.createdAt.toISOString() });
});

router.delete("/subjects/:id", async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(req.params.id);
  await db.delete(subjectsTable).where(and(eq(subjectsTable.id, id), eq(subjectsTable.tenantId, tenant.id)));
  res.json({ success: true });
});

// TOPICS
router.get("/topics", async (req, res) => {
  const tenant = (req as any).tenant;
  const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;
  let topics;
  if (subjectId) {
    const rows = await db.select().from(topicsTable)
      .innerJoin(subjectsTable, eq(topicsTable.subjectId, subjectsTable.id))
      .where(and(eq(topicsTable.subjectId, subjectId), eq(subjectsTable.tenantId, tenant.id)));
    topics = rows.map(t => ({ ...t.topics, createdAt: t.topics.createdAt.toISOString() }));
  } else {
    const allSubjects = await db.select({ id: subjectsTable.id }).from(subjectsTable).where(eq(subjectsTable.tenantId, tenant.id));
    const subjectIds = allSubjects.map(s => s.id);
    if (subjectIds.length === 0) { res.json([]); return; }
    const rows = await db.select().from(topicsTable).where(inArray(topicsTable.subjectId, subjectIds));
    topics = rows.map(t => ({ ...t, createdAt: t.createdAt.toISOString() }));
  }
  res.json(topics);
});

router.post("/topics", async (req, res) => {
  const { subjectId, name, description } = req.body;
  const [t] = await db.insert(topicsTable).values({ subjectId, name, description }).returning();
  res.status(201).json({ ...t, createdAt: t.createdAt.toISOString() });
});

router.put("/topics/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { subjectId, name, description } = req.body;
  const [t] = await db.update(topicsTable).set({ subjectId, name, description }).where(eq(topicsTable.id, id)).returning();
  if (!t) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...t, createdAt: t.createdAt.toISOString() });
});

router.delete("/topics/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(topicsTable).where(eq(topicsTable.id, id));
  res.json({ success: true });
});

// SERIES
router.get("/series", async (req, res) => {
  const tenant = (req as any).tenant;
  const series = await db.select().from(seriesTable).where(eq(seriesTable.tenantId, tenant.id));
  res.json(series.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.post("/series", async (req, res) => {
  const tenant = (req as any).tenant;
  const { name, educationalLevel, order } = req.body;
  const [s] = await db.insert(seriesTable).values({ tenantId: tenant.id, name, educationalLevel, order }).returning();
  res.status(201).json({ ...s, createdAt: s.createdAt.toISOString() });
});

// CLASSES
router.get("/classes", async (req, res) => {
  const tenant = (req as any).tenant;
  const serieId = req.query.serieId ? parseInt(req.query.serieId as string) : undefined;
  let classes;
  if (serieId) {
    classes = await db.select().from(classesTable).where(and(eq(classesTable.tenantId, tenant.id), eq(classesTable.serieId, serieId)));
  } else {
    classes = await db.select().from(classesTable).where(eq(classesTable.tenantId, tenant.id));
  }
  const classIds = classes.map(c => c.id);
  let studentCounts: Record<number, number> = {};
  if (classIds.length > 0) {
    const counts = await db.select({ classId: classStudentsTable.classId, cnt: count() })
      .from(classStudentsTable).where(inArray(classStudentsTable.classId, classIds)).groupBy(classStudentsTable.classId);
    studentCounts = Object.fromEntries(counts.map(c => [c.classId, Number(c.cnt)]));
  }
  res.json(classes.map(c => ({ ...c, studentsCount: studentCounts[c.id] ?? 0, createdAt: c.createdAt.toISOString() })));
});

router.post("/classes", async (req, res) => {
  const tenant = (req as any).tenant;
  const { serieId, name, shift, year } = req.body;
  const [c] = await db.insert(classesTable).values({ tenantId: tenant.id, serieId, name, shift, year }).returning();
  res.status(201).json({ ...c, studentsCount: 0, createdAt: c.createdAt.toISOString() });
});

router.get("/classes/:id", async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(req.params.id);
  const [cls] = await db.select().from(classesTable).where(and(eq(classesTable.id, id), eq(classesTable.tenantId, tenant.id)));
  if (!cls) { res.status(404).json({ error: "Not found" }); return; }
  const [serie] = await db.select().from(seriesTable).where(eq(seriesTable.id, cls.serieId));
  const enrollments = await db.select({ studentId: classStudentsTable.studentId }).from(classStudentsTable).where(eq(classStudentsTable.classId, id));
  const studentIds = enrollments.map(e => e.studentId);
  let students: any[] = [];
  if (studentIds.length > 0) {
    const rawStudents = await db.select().from(usersTable).where(inArray(usersTable.id, studentIds));
    students = rawStudents.map(s => {
      const { passwordHash: _, ...safe } = s;
      return { ...safe, createdAt: safe.createdAt.toISOString(), updatedAt: safe.updatedAt.toISOString() };
    });
  }
  res.json({
    ...cls,
    studentsCount: students.length,
    createdAt: cls.createdAt.toISOString(),
    serie: { ...serie, createdAt: serie.createdAt.toISOString() },
    students,
  });
});

router.put("/classes/:id", async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(req.params.id);
  const { serieId, name, shift, year } = req.body;
  const [c] = await db.update(classesTable).set({ serieId, name, shift, year }).where(and(eq(classesTable.id, id), eq(classesTable.tenantId, tenant.id))).returning();
  if (!c) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...c, studentsCount: 0, createdAt: c.createdAt.toISOString() });
});

router.delete("/classes/:id", async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(req.params.id);
  await db.delete(classesTable).where(and(eq(classesTable.id, id), eq(classesTable.tenantId, tenant.id)));
  res.json({ success: true });
});

router.post("/classes/:id/students", async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(req.params.id);
  const { studentId } = req.body;
  // Verify class belongs to tenant
  const [cls] = await db.select().from(classesTable)
    .where(and(eq(classesTable.id, id), eq(classesTable.tenantId, tenant.id)));
  if (!cls) { res.status(404).json({ error: "Class not found" }); return; }
  // Verify student belongs to tenant
  const [student] = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, studentId), eq(usersTable.tenantId, tenant.id)));
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  await db.insert(classStudentsTable).values({ classId: id, studentId }).onConflictDoNothing();
  res.json({ success: true });
});

router.get("/classes/:id/stats", async (req, res) => {
  const tenant = (req as any).tenant;
  const id = parseInt(req.params.id);
  const enrollments = await db.select({ studentId: classStudentsTable.studentId }).from(classStudentsTable).where(eq(classStudentsTable.classId, id));
  const studentIds = enrollments.map(e => e.studentId);
  if (studentIds.length === 0) {
    res.json({ classId: id, averageScore: null, completionRate: 0, ranking: [], bySubject: [], examsTaken: 0 });
    return;
  }
  const sessions = await db.select().from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(and(inArray(examSessionsTable.studentId, studentIds), eq(examsTable.tenantId, tenant.id)));
  const completed = sessions.filter(s => s.exam_sessions.status === "submitted");
  const scores = completed.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const studentScores: Record<number, number[]> = {};
  completed.forEach(s => {
    const sid = s.exam_sessions.studentId;
    if (!studentScores[sid]) studentScores[sid] = [];
    if (s.exam_sessions.score) studentScores[sid].push(parseFloat(String(s.exam_sessions.score)));
  });
  const studentData = await db.select().from(usersTable).where(inArray(usersTable.id, studentIds));
  const ranking = studentData.map(u => {
    const sc = studentScores[u.id] ?? [];
    const avg = sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : 0;
    const maxScore = sc.length ? 10 : 0;
    return { userId: u.id, name: u.name, score: avg, percentage: maxScore > 0 ? (avg / maxScore) * 100 : 0, rank: 0 };
  }).sort((a, b) => b.score - a.score).map((s, i) => ({ ...s, rank: i + 1 }));
  // bySubject breakdown
  const subjectScores: Record<number, { name: string; color: string | null; scores: number[] }> = {};
  for (const row of completed) {
    const subId = row.exams.subjectId;
    if (!subId) continue;
    if (!subjectScores[subId]) subjectScores[subId] = { name: "", color: null, scores: [] };
    const sc = parseFloat(String(row.exam_sessions.score ?? 0));
    const mx = parseFloat(String(row.exam_sessions.maxScore ?? 10));
    subjectScores[subId].scores.push(mx > 0 ? (sc / mx) * 10 : 0);
  }
  // fetch subject names
  const subIds = Object.keys(subjectScores).map(Number);
  if (subIds.length > 0) {
    const { subjectsTable } = await import("@workspace/db");
    const subs = await db.select().from(subjectsTable).where(inArray(subjectsTable.id, subIds));
    subs.forEach(s => { if (subjectScores[s.id]) { subjectScores[s.id].name = s.name; subjectScores[s.id].color = s.color ?? null; } });
  }
  const bySubject = Object.entries(subjectScores).map(([subId, data]) => ({
    subjectId: parseInt(subId), subjectName: data.name, color: data.color,
    averageScore: data.scores.length ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : null,
    totalAttempts: data.scores.length,
  }));

  res.json({
    classId: id,
    averageScore: avgScore,
    completionRate: sessions.length > 0 ? completed.length / sessions.length : 0,
    ranking,
    bySubject,
    examsTaken: completed.length,
  });
});

export default router;
