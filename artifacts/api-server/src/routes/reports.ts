import { Router } from "express";
import {
  db, examsTable, examSessionsTable, subjectsTable, activityLogTable, usersTable,
  classesTable, classStudentsTable, studentAnswersTable, questionsTable, questionOptionsTable,
  seriesTable, topicsTable
} from "@workspace/db";
import { eq, sql, and, inArray } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();
router.use(requireAuth);
router.use(requireRole("admin", "coordinator", "teacher"));

// ===== Helper functions =====

function linearRegression(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const sumY2 = points.reduce((s, p) => s + p.y * p.y, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const ssTot = sumY2 - (sumY * sumY) / n;
  const ssRes = points.reduce((s, p) => s + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2: Math.max(0, r2) };
}

function scoreToPercent(score: number, maxScore: number) {
  return maxScore > 0 ? (score / maxScore) * 100 : 0;
}

function riskLevel(slope: number, avgPercent: number) {
  if (avgPercent < 30 || (slope < -3 && avgPercent < 50)) return { level: "critical", label: "Risco Crítico", color: "#ef4444" };
  if (avgPercent < 50 || (slope < -1.5 && avgPercent < 60)) return { level: "high", label: "Risco Alto", color: "#f59e0b" };
  if (slope < 0 && avgPercent < 65) return { level: "medium", label: "Risco Moderado", color: "#f97316" };
  return { level: "low", label: "Desempenho Estável", color: "#10b981" };
}

function diagnoseTopicErrorRate(errorRate: number, totalStudents: number) {
  if (totalStudents <= 5) {
    if (errorRate >= 60) return { type: "approach", message: "Mais da metade da turma pequena erra neste tópico — possível problema de abordagem" };
    return { type: "individual", message: "Taxa de erro não indica padrão de turma — possível dificuldade individual" };
  }
  if (errorRate >= 60) return { type: "approach", message: "Mais de 60% da turma erra neste tópico — possível problema de abordagem pedagógica" };
  if (errorRate >= 40) return { type: "mixed", message: "Entre 40% e 60% erram — misto de dificuldade individual e possível revisão de abordagem" };
  return { type: "individual", message: "Menos de 40% erram — provavelmente dificuldade individual de aprendizagem" };
}

function classNameFor(cls: any, series: any[]) {
  const s = series.find((x: any) => x.id === cls.serieId);
  return `${s?.name ?? ""} ${cls.name}`.trim();
}

// ===== /reports/overview (enhanced) =====

router.get("/overview", async (req, res) => {
  const tenant = (req as any).tenant;
  const tid = tenant.id;

  const allSessions = await db.select().from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(eq(examsTable.tenantId, tid));
  const completed = allSessions.filter(s => s.exam_sessions.status === "submitted");
  const scores = completed.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const months: { month: string; sessionsCount: number; averageScore: number | null }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1); d.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setMonth(end.getMonth() + 1);
    const monthSessions = completed.filter(s => {
      const t = s.exam_sessions.startedAt;
      return t >= d && t < end;
    });
    const ms = monthSessions.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
    months.push({
      month: d.toLocaleString("pt-BR", { month: "short", year: "2-digit" }),
      sessionsCount: monthSessions.length,
      averageScore: ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : null,
    });
  }

  const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.tenantId, tid));
  const subjectBreakdown = computeSubjectBreakdown(subjects, allSessions);

  const classes = await db.select().from(classesTable).where(eq(classesTable.tenantId, tid));
  const series = await db.select().from(seriesTable).where(eq(seriesTable.tenantId, tid));
  let topPerformingClass: { classId: number; className: string; averageScore: number } | null = null;
  let lowestPerformingClass: { classId: number; className: string; averageScore: number } | null = null;

  const classStats = [];
  if (classes.length > 0) {
    const classEnrollments = await db.select().from(classStudentsTable)
      .where(inArray(classStudentsTable.classId, classes.map(c => c.id)));
    const allStudents = await db.select().from(usersTable).where(eq(usersTable.tenantId, tid));
    for (const cls of classes) {
      const enrolled = classEnrollments.filter(e => e.classId === cls.id).map(e => e.studentId);
      const classSessions = completed.filter(s => enrolled.includes(s.exam_sessions.studentId));
      const classScores = classSessions.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
      const classMax = classSessions.map(s => parseFloat(String(s.exam_sessions.maxScore ?? 10)));
      const pcts = classScores.map((sc, i) => classMax[i] > 0 ? (sc / classMax[i]) * 100 : 0);
      const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
      const studentsCount = allStudents.filter(u => u.role === "student" && enrolled.includes(u.id)).length;
      classStats.push({ classId: cls.id, className: classNameFor(cls, series), averageScore: avg, count: pcts.length, studentsCount, shift: cls.shift });
    }
    const valid = classStats.filter(c => c.count > 0).sort((a, b) => b.averageScore - a.averageScore);
    if (valid.length > 0) {
      topPerformingClass = { classId: valid[0].classId, className: valid[0].className, averageScore: valid[0].averageScore };
      lowestPerformingClass = { classId: valid[valid.length - 1].classId, className: valid[valid.length - 1].className, averageScore: valid[valid.length - 1].averageScore };
    }
  }

  const filledSubjects = subjectBreakdown.filter(s => s.totalAttempts > 0);
  const mostDifficultSubject = filledSubjects.length > 0
    ? filledSubjects.reduce((prev, cur) => (cur.averageScore ?? 10) < (prev.averageScore ?? 10) ? cur : prev)
    : null;

  // At-risk students
  const allStudents = await db.select().from(usersTable).where(eq(usersTable.tenantId, tid));
  const students = allStudents.filter(u => u.role === "student");
  const atRiskStudents = [];
  for (const student of students) {
    const stSessions = completed.filter(s => s.exam_sessions.studentId === student.id);
    if (stSessions.length < 2) continue;
    const points = stSessions.map((s, idx) => ({
      x: idx,
      y: scoreToPercent(parseFloat(String(s.exam_sessions.score ?? 0)), parseFloat(String(s.exam_sessions.maxScore ?? 10))),
    }));
    const avg = points.reduce((a, p) => a + p.y, 0) / points.length;
    const reg = linearRegression(points);
    const r = riskLevel(reg.slope, avg);
    if (r.level !== "low") {
      atRiskStudents.push({
        studentId: student.id,
        studentName: student.name,
        averagePercentage: avg,
        trendSlope: reg.slope,
        riskLevel: r.level,
        riskLabel: r.label,
        riskColor: r.color,
        examsCount: stSessions.length,
      });
    }
  }

  res.json({
    totalExamsSessions: allSessions.length,
    averageScoreAllTime: avgScore,
    topPerformingClass,
    lowestPerformingClass,
    mostDifficultSubject: mostDifficultSubject ? { subjectId: mostDifficultSubject.subjectId, subjectName: mostDifficultSubject.subjectName, averageScore: mostDifficultSubject.averageScore } : null,
    monthlyActivity: months,
    subjectBreakdown,
    classStats: classStats.filter(c => c.count > 0),
    atRiskStudents: atRiskStudents.sort((a, b) => (b.riskLevel === "critical" ? 3 : b.riskLevel === "high" ? 2 : b.riskLevel === "medium" ? 1 : 0) - (a.riskLevel === "critical" ? 3 : a.riskLevel === "high" ? 2 : a.riskLevel === "medium" ? 1 : 0)),
  });
});

function computeSubjectBreakdown(subjects: any[], allSessions: any[]) {
  const completed = allSessions.filter(s => s.exam_sessions.status === "submitted");
  const bySubject: Record<number, number[]> = {};
  for (const row of completed) {
    const subjectId = row.exams.subjectId;
    if (!subjectId) continue;
    if (!bySubject[subjectId]) bySubject[subjectId] = [];
    const sc = parseFloat(String(row.exam_sessions.score ?? 0));
    const mx = parseFloat(String(row.exam_sessions.maxScore ?? 10));
    bySubject[subjectId].push(mx > 0 ? (sc / mx) * 100 : 0);
  }
  return subjects.map(s => {
    const scores = bySubject[s.id] ?? [];
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return {
      subjectId: s.id, subjectName: s.name,
      averageScore: avg, totalAttempts: scores.length,
      color: s.color ?? null,
    };
  });
}

// ===== /reports/subject-performance =====
router.get("/subject-performance", async (req, res) => {
  const tenant = (req as any).tenant;
  const tid = tenant.id;
  const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.tenantId, tid));
  const allSessions = await db.select().from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(and(eq(examsTable.tenantId, tid), sql`exam_sessions.status = 'submitted'`));
  const bySubject: Record<number, number[]> = {};
  for (const row of allSessions) {
    const subjectId = row.exams.subjectId;
    if (!subjectId) continue;
    if (!bySubject[subjectId]) bySubject[subjectId] = [];
    const sc = parseFloat(String(row.exam_sessions.score ?? 0));
    const mx = parseFloat(String(row.exam_sessions.maxScore ?? 10));
    bySubject[subjectId].push(mx > 0 ? (sc / mx) * 100 : 0);
  }
  res.json(subjects.map(s => {
    const scores = bySubject[s.id] ?? [];
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return {
      subjectId: s.id, subjectName: s.name,
      averageScore: avg, totalAttempts: scores.length,
      color: s.color ?? null,
    };
  }));
});

// ===== /reports/recent-activity =====
router.get("/recent-activity", async (req, res) => {
  const tenant = (req as any).tenant;
  const activities = await db.select({
    activity: activityLogTable,
    user: { name: usersTable.name },
  }).from(activityLogTable)
    .innerJoin(usersTable, eq(activityLogTable.userId, usersTable.id))
    .where(eq(activityLogTable.tenantId, tenant.id))
    .orderBy(sql`${activityLogTable.createdAt} DESC`)
    .limit(20);
  res.json(activities.map(a => ({
    id: a.activity.id,
    type: a.activity.type,
    description: a.activity.description,
    userName: a.user.name,
    createdAt: a.activity.createdAt.toISOString(),
  })));
});

// ===== /reports/class-comparison (POST body: {classA, classB, subjectId?}) =====
router.post("/class-comparison", async (req, res) => {
  const tenant = (req as any).tenant;
  const tid = tenant.id;
  const { classA, classB, subjectId } = req.body;
  if (!classA || !classB) { res.status(400).json({ error: "classA e classB são obrigatórios" }); return; }

  const [clsA, clsB] = await Promise.all([
    db.select().from(classesTable).where(and(eq(classesTable.id, classA), eq(classesTable.tenantId, tid))).then(r => r[0]),
    db.select().from(classesTable).where(and(eq(classesTable.id, classB), eq(classesTable.tenantId, tid))).then(r => r[0]),
  ]);
  if (!clsA || !clsB) { res.status(404).json({ error: "Turma não encontrada" }); return; }

  const series = await db.select().from(seriesTable).where(eq(seriesTable.tenantId, tid));
  const students = await db.select().from(usersTable).where(eq(usersTable.tenantId, tid));
  const enrollments = await db.select().from(classStudentsTable).where(inArray(classStudentsTable.classId, [classA, classB]));
  const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.tenantId, tid));

  const allSessions = await db.select().from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(and(
      eq(examsTable.tenantId, tid),
      sql`exam_sessions.status = 'submitted'`,
      subjectId ? eq(examsTable.subjectId, subjectId) : undefined
    ));

  async function buildClassData(classId: number, cls: any) {
    const enrolled = enrollments.filter(e => e.classId === classId).map(e => e.studentId);
    const classStudents = students.filter(u => u.role === "student" && enrolled.includes(u.id));
    const classSessions = allSessions.filter(s => enrolled.includes(s.exam_sessions.studentId));
    const scores = classSessions.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
    const maxScores = classSessions.map(s => parseFloat(String(s.exam_sessions.maxScore ?? 10)));
    const pcts = scores.map((sc, i) => maxScores[i] > 0 ? (sc / maxScores[i]) * 100 : 0);
    const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
    const median = pcts.length ? pcts.sort((a, b) => a - b)[Math.floor(pcts.length / 2)] : 0;
    const min = pcts.length ? Math.min(...pcts) : 0;
    const max = pcts.length ? Math.max(...pcts) : 0;

    // By subject
    const bySubject: Record<number, number[]> = {};
    for (const row of classSessions) {
      const sid = row.exams.subjectId;
      if (!sid) continue;
      if (!bySubject[sid]) bySubject[sid] = [];
      const sc = parseFloat(String(row.exam_sessions.score ?? 0));
      const mx = parseFloat(String(row.exam_sessions.maxScore ?? 10));
      bySubject[sid].push(mx > 0 ? (sc / mx) * 100 : 0);
    }
    const subjectBreakdown = subjects.map(s => {
      const arr = bySubject[s.id] ?? [];
      return { subjectId: s.id, subjectName: s.name, average: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0, count: arr.length };
    }).filter(s => s.count > 0);

    // Top and bottom students
    const studentMap: Record<number, { score: number; max: number; count: number }> = {};
    for (const row of classSessions) {
      const sid = row.exam_sessions.studentId;
      if (!studentMap[sid]) studentMap[sid] = { score: 0, max: 0, count: 0 };
      studentMap[sid].score += parseFloat(String(row.exam_sessions.score ?? 0));
      studentMap[sid].max += parseFloat(String(row.exam_sessions.maxScore ?? 10));
      studentMap[sid].count += 1;
    }
    const studentList = Object.entries(studentMap).map(([id, v]) => {
      const pct = v.max > 0 ? (v.score / v.max) * 100 : 0;
      const st = students.find(u => u.id === Number(id));
      return { studentId: Number(id), studentName: st?.name ?? "", average: pct, count: v.count };
    }).sort((a, b) => b.average - a.average);

    return {
      classId,
      className: classNameFor(cls, series),
      studentsCount: classStudents.length,
      totalSessions: classSessions.length,
      averageScore: avg,
      medianScore: median,
      minScore: min,
      maxScore: max,
      subjectBreakdown,
      topStudents: studentList.slice(0, 3),
      bottomStudents: studentList.slice(-3).reverse(),
    };
  }

  const [dataA, dataB] = await Promise.all([buildClassData(classA, clsA), buildClassData(classB, clsB)]);

  // Shared subjects for comparison
  const sharedSubjects = dataA.subjectBreakdown.filter(a => dataB.subjectBreakdown.some(b => b.subjectId === a.subjectId))
    .map(a => {
      const b = dataB.subjectBreakdown.find(x => x.subjectId === a.subjectId)!;
      return { subjectName: a.subjectName, classA: a.average, classB: b.average, difference: a.average - b.average };
    });

  // Difference analysis
  const scoreDiff = dataA.averageScore - dataB.averageScore;
  let insight = "";
  if (Math.abs(scoreDiff) < 5) insight = "As turmas têm desempenho muito similar.";
  else if (scoreDiff > 10) insight = `${dataA.className} está com desempenho significativamente superior. Verificar metodologia e práticas dessa turma.`;
  else if (scoreDiff < -10) insight = `${dataB.className} está com desempenho significativamente superior. Recomenda-se observar a abordagem em ${dataA.className}.`;
  else insight = `Diferença de ${Math.abs(scoreDiff).toFixed(1)}% entre as turmas. Investigar fatores como horário, professor e metodologia.`;

  res.json({
    classA: dataA,
    classB: dataB,
    sharedSubjectComparison: sharedSubjects,
    scoreDifference: scoreDiff,
    insight,
  });
});

// ===== /reports/student-comparison (POST body: {studentA, studentB}) =====
router.post("/student-comparison", async (req, res) => {
  const tenant = (req as any).tenant;
  const tid = tenant.id;
  const { studentA, studentB } = req.body;
  if (!studentA || !studentB) { res.status(400).json({ error: "studentA e studentB são obrigatórios" }); return; }

  const [stA, stB] = await Promise.all([
    db.select().from(usersTable).where(and(eq(usersTable.id, studentA), eq(usersTable.tenantId, tid), eq(usersTable.role, "student"))).then(r => r[0]),
    db.select().from(usersTable).where(and(eq(usersTable.id, studentB), eq(usersTable.tenantId, tid), eq(usersTable.role, "student"))).then(r => r[0]),
  ]);
  if (!stA || !stB) { res.status(404).json({ error: "Aluno não encontrado" }); return; }

  const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.tenantId, tid));
  const allSessions = await db.select().from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(and(eq(examsTable.tenantId, tid), sql`exam_sessions.status = 'submitted'`));

  async function buildStudentData(studentId: number) {
    const sessions = allSessions.filter(s => s.exam_sessions.studentId === studentId).sort((a, b) => new Date(a.exam_sessions.startedAt).getTime() - new Date(b.exam_sessions.startedAt).getTime());
    const scores = sessions.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
    const maxScores = sessions.map(s => parseFloat(String(s.exam_sessions.maxScore ?? 10)));
    const pcts = scores.map((sc, i) => maxScores[i] > 0 ? (sc / maxScores[i]) * 100 : 0);
    const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;

    const timeline = sessions.map((s, i) => ({
      examId: s.exams.id,
      examTitle: s.exams.title,
      date: s.exam_sessions.startedAt.toISOString(),
      score: pcts[i],
    }));

    const points = pcts.map((y, x) => ({ x, y }));
    const reg = linearRegression(points);
    const r = riskLevel(reg.slope, avg);

    const bySubject: Record<number, number[]> = {};
    for (const row of sessions) {
      const sid = row.exams.subjectId;
      if (!sid) continue;
      if (!bySubject[sid]) bySubject[sid] = [];
      const sc = parseFloat(String(row.exam_sessions.score ?? 0));
      const mx = parseFloat(String(row.exam_sessions.maxScore ?? 10));
      bySubject[sid].push(mx > 0 ? (sc / mx) * 100 : 0);
    }
    const subjectBreakdown = subjects.map(s => {
      const arr = bySubject[s.id] ?? [];
      return { subjectId: s.id, subjectName: s.name, average: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0, count: arr.length };
    }).filter(s => s.count > 0);

    return {
      studentId,
      studentName: studentId === stA.id ? stA.name : stB.name,
      averageScore: avg,
      totalExams: sessions.length,
      timeline,
      trendSlope: reg.slope,
      trendR2: reg.r2,
      riskLevel: r.level,
      riskLabel: r.label,
      riskColor: r.color,
      subjectBreakdown,
    };
  }

  const [dataA, dataB] = await Promise.all([buildStudentData(studentA), buildStudentData(studentB)]);

  const sharedSubjects = dataA.subjectBreakdown.filter(a => dataB.subjectBreakdown.some(b => b.subjectId === a.subjectId))
    .map(a => {
      const b = dataB.subjectBreakdown.find(x => x.subjectId === a.subjectId)!;
      return { subjectName: a.subjectName, studentA: a.average, studentB: b.average, difference: a.average - b.average };
    });

  const scoreDiff = dataA.averageScore - dataB.averageScore;
  let insight = "";
  if (Math.abs(scoreDiff) < 5) insight = "Ambos os alunos têm desempenho similar.";
  else if (scoreDiff > 10) insight = `${dataA.studentName} está com média ${scoreDiff.toFixed(1)}% superior. A tendência de ${dataA.trendSlope > 0 ? "crescimento" : "estabilidade"} é ${dataA.trendR2 > 0.5 ? "consistente" : "variável"}.`;
  else insight = `${dataB.studentName} está com média ${Math.abs(scoreDiff).toFixed(1)}% superior. A tendência de ${dataB.trendSlope > 0 ? "crescimento" : "estabilidade"} é ${dataB.trendR2 > 0.5 ? "consistente" : "variável"}.`;

  res.json({
    studentA: dataA,
    studentB: dataB,
    sharedSubjectComparison: sharedSubjects,
    scoreDifference: scoreDiff,
    insight,
  });
});

// ===== /reports/class-detail/:classId =====
router.get("/class-detail/:classId", async (req, res) => {
  const tenant = (req as any).tenant;
  const tid = tenant.id;
  const classId = parseInt(req.params.classId);
  const cls = await db.select().from(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.tenantId, tid))).then(r => r[0]);
  if (!cls) { res.status(404).json({ error: "Turma não encontrada" }); return; }

  const series = await db.select().from(seriesTable).where(eq(seriesTable.tenantId, tid));
  const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.tenantId, tid));
  const topics = await db.select().from(topicsTable);
  const students = await db.select().from(usersTable).where(eq(usersTable.tenantId, tid));
  const enrollments = await db.select().from(classStudentsTable).where(eq(classStudentsTable.classId, classId));
  const enrolledIds = enrollments.map(e => e.studentId);
  const classStudents = students.filter(u => u.role === "student" && enrolledIds.includes(u.id));

  const allSessions = await db.select().from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(and(eq(examsTable.tenantId, tid), sql`exam_sessions.status = 'submitted'`));
  const classSessions = allSessions.filter(s => enrolledIds.includes(s.exam_sessions.studentId));

  // Student breakdown
  const studentData: any[] = [];
  for (const st of classStudents) {
    const stSessions = classSessions.filter(s => s.exam_sessions.studentId === st.id);
    const scores = stSessions.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
    const maxScores = stSessions.map(s => parseFloat(String(s.exam_sessions.maxScore ?? 10)));
    const pcts = scores.map((sc, i) => maxScores[i] > 0 ? (sc / maxScores[i]) * 100 : 0);
    const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
    const points = pcts.map((y, x) => ({ x, y }));
    const reg = linearRegression(points);
    const r = riskLevel(reg.slope, avg);
    studentData.push({
      studentId: st.id,
      studentName: st.name,
      averageScore: avg,
      examsCount: stSessions.length,
      trendSlope: reg.slope,
      trendR2: reg.r2,
      riskLevel: r.level,
      riskLabel: r.label,
      riskColor: r.color,
    });
  }
  studentData.sort((a, b) => b.averageScore - a.averageScore);

  // Subject breakdown
  const bySubject: Record<number, number[]> = {};
  for (const row of classSessions) {
    const sid = row.exams.subjectId;
    if (!sid) continue;
    if (!bySubject[sid]) bySubject[sid] = [];
    const sc = parseFloat(String(row.exam_sessions.score ?? 0));
    const mx = parseFloat(String(row.exam_sessions.maxScore ?? 10));
    bySubject[sid].push(mx > 0 ? (sc / mx) * 100 : 0);
  }
  const subjectBreakdown = subjects.map(s => {
    const arr = bySubject[s.id] ?? [];
    return { subjectId: s.id, subjectName: s.name, average: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0, count: arr.length };
  }).filter(s => s.count > 0);

  // Topic-level analysis
  const allAnswers = await db.select({
    answer: studentAnswersTable,
    question: questionsTable,
    session: examSessionsTable,
  }).from(studentAnswersTable)
    .innerJoin(questionsTable, eq(studentAnswersTable.questionId, questionsTable.id))
    .innerJoin(examSessionsTable, eq(studentAnswersTable.sessionId, examSessionsTable.id))
    .where(inArray(examSessionsTable.studentId, enrolledIds));

  const byTopic: Record<number, { total: number; correct: number; students: Set<number> }> = {};
  for (const row of allAnswers) {
    if (!row.question.topicId) continue;
    if (!byTopic[row.question.topicId]) byTopic[row.question.topicId] = { total: 0, correct: 0, students: new Set() };
    byTopic[row.question.topicId].total += 1;
    if (row.answer.isCorrect) byTopic[row.question.topicId].correct += 1;
    byTopic[row.question.topicId].students.add(row.session.studentId);
  }

  const topicAnalysis = Object.entries(byTopic).map(([tid, v]) => {
    const topic = topics.find(t => t.id === Number(tid));
    const errorRate = v.total > 0 ? ((v.total - v.correct) / v.total) * 100 : 0;
    const diag = diagnoseTopicErrorRate(errorRate, v.students.size);
    return {
      topicId: Number(tid),
      topicName: topic?.name ?? "Tópico desconhecido",
      subjectName: subjects.find(s => s.id === topic?.subjectId)?.name ?? "",
      totalAnswers: v.total,
      correctRate: v.total > 0 ? (v.correct / v.total) * 100 : 0,
      errorRate,
      studentsAffected: v.students.size,
      diagnosisType: diag.type,
      diagnosisMessage: diag.message,
    };
  }).sort((a, b) => b.errorRate - a.errorRate);

  res.json({
    classId,
    className: classNameFor(cls, series),
    studentsCount: classStudents.length,
    totalSessions: classSessions.length,
    averageScore: studentData.length ? studentData.reduce((a, s) => a + s.averageScore, 0) / studentData.length : 0,
    students: studentData,
    subjectBreakdown,
    topicAnalysis,
  });
});

// ===== /reports/student-prediction =====
router.get("/student-prediction", async (req, res) => {
  const tenant = (req as any).tenant;
  const tid = tenant.id;
  const allStudents = await db.select().from(usersTable).where(eq(usersTable.tenantId, tid));
  const students = allStudents.filter(u => u.role === "student");

  const allSessions = await db.select().from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(and(eq(examsTable.tenantId, tid), sql`exam_sessions.status = 'submitted'`));

  const predictions: any[] = [];
  for (const student of students) {
    const stSessions = allSessions.filter(s => s.exam_sessions.studentId === student.id)
      .sort((a, b) => new Date(a.exam_sessions.startedAt).getTime() - new Date(b.exam_sessions.startedAt).getTime());
    if (stSessions.length < 2) continue;

    const points = stSessions.map((s, idx) => ({
      x: idx,
      y: scoreToPercent(parseFloat(String(s.exam_sessions.score ?? 0)), parseFloat(String(s.exam_sessions.maxScore ?? 10))),
    }));
    const avg = points.reduce((a, p) => a + p.y, 0) / points.length;
    const reg = linearRegression(points);
    const r = riskLevel(reg.slope, avg);
    const predictedNext = Math.max(0, Math.min(100, reg.slope * points.length + reg.intercept));

    // Find weakest subjects
    const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.tenantId, tid));
    const bySubject: Record<number, number[]> = {};
    for (const row of stSessions) {
      const sid = row.exams.subjectId;
      if (!sid) continue;
      if (!bySubject[sid]) bySubject[sid] = [];
      const sc = parseFloat(String(row.exam_sessions.score ?? 0));
      const mx = parseFloat(String(row.exam_sessions.maxScore ?? 10));
      bySubject[sid].push(mx > 0 ? (sc / mx) * 100 : 0);
    }
    const weakSubjects = subjects.map(s => {
      const arr = bySubject[s.id] ?? [];
      const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 100;
      return { subjectId: s.id, subjectName: s.name, average: avg };
    }).filter(s => s.average < 50).sort((a, b) => a.average - b.average);

    predictions.push({
      studentId: student.id,
      studentName: student.name,
      averagePercentage: avg,
      trendSlope: reg.slope,
      trendR2: reg.r2,
      riskLevel: r.level,
      riskLabel: r.label,
      riskColor: r.color,
      predictedNextScore: predictedNext,
      examsCount: stSessions.length,
      weakSubjects: weakSubjects.slice(0, 3),
      timeline: points.map((p, i) => ({ examTitle: stSessions[i].exams.title, score: p.y })),
    });
  }

  // Sort by risk level
  const riskOrder = { critical: 3, high: 2, medium: 1, low: 0 };
  predictions.sort((a, b) => riskOrder[b.riskLevel as keyof typeof riskOrder] - riskOrder[a.riskLevel as keyof typeof riskOrder]);

  res.json({ predictions });
});

// ===== /reports/diagnostic =====
router.get("/diagnostic", async (req, res) => {
  const tenant = (req as any).tenant;
  const tid = tenant.id;
  const { classId, subjectId } = req.query;
  const cId = classId ? parseInt(String(classId)) : undefined;

  const students = await db.select().from(usersTable).where(eq(usersTable.tenantId, tid));
  const allStudents = students.filter(u => u.role === "student");
  const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.tenantId, tid));
  const topics = await db.select().from(topicsTable);
  const classes = await db.select().from(classesTable).where(eq(classesTable.tenantId, tid));
  const series = await db.select().from(seriesTable).where(eq(seriesTable.tenantId, tid));

  let enrolledIds: number[] = allStudents.map(s => s.id);
  if (cId) {
    const enrollments = await db.select().from(classStudentsTable).where(eq(classStudentsTable.classId, cId));
    enrolledIds = enrollments.map(e => e.studentId);
  }

  const allSessions = await db.select().from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(and(
      eq(examsTable.tenantId, tid),
      sql`exam_sessions.status = 'submitted'`,
      subjectId ? eq(examsTable.subjectId, parseInt(String(subjectId))) : undefined,
    ));
  const classSessions = allSessions.filter(s => enrolledIds.includes(s.exam_sessions.studentId));

  // Low performing students
  const lowStudents: any[] = [];
  for (const student of allStudents) {
    if (!enrolledIds.includes(student.id)) continue;
    const stSessions = classSessions.filter(s => s.exam_sessions.studentId === student.id);
    if (stSessions.length < 1) continue;
    const scores = stSessions.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
    const maxScores = stSessions.map(s => parseFloat(String(s.exam_sessions.maxScore ?? 10)));
    const pcts = scores.map((sc, i) => maxScores[i] > 0 ? (sc / maxScores[i]) * 100 : 0);
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    if (avg < 50) {
      lowStudents.push({ studentId: student.id, studentName: student.name, average: avg, count: stSessions.length });
    }
  }
  lowStudents.sort((a, b) => a.average - b.average);

  // Topic analysis
  const allAnswers = await db.select({
    answer: studentAnswersTable,
    question: questionsTable,
    session: examSessionsTable,
  }).from(studentAnswersTable)
    .innerJoin(questionsTable, eq(studentAnswersTable.questionId, questionsTable.id))
    .innerJoin(examSessionsTable, eq(studentAnswersTable.sessionId, examSessionsTable.id))
    .where(inArray(examSessionsTable.studentId, enrolledIds));

  const byTopic: Record<number, { total: number; correct: number; students: Set<number> }> = {};
  for (const row of allAnswers) {
    if (!row.question.topicId) continue;
    if (!byTopic[row.question.topicId]) byTopic[row.question.topicId] = { total: 0, correct: 0, students: new Set() };
    byTopic[row.question.topicId].total += 1;
    if (row.answer.isCorrect) byTopic[row.question.topicId].correct += 1;
    byTopic[row.question.topicId].students.add(row.session.studentId);
  }

  const topicAnalysis = Object.entries(byTopic).map(([tid, v]) => {
    const topic = topics.find(t => t.id === Number(tid));
    const errorRate = v.total > 0 ? ((v.total - v.correct) / v.total) * 100 : 0;
    const diag = diagnoseTopicErrorRate(errorRate, v.students.size);
    return {
      topicId: Number(tid),
      topicName: topic?.name ?? "Tópico desconhecido",
      subjectName: subjects.find(s => s.id === topic?.subjectId)?.name ?? "",
      totalAnswers: v.total,
      correctRate: v.total > 0 ? (v.correct / v.total) * 100 : 0,
      errorRate,
      studentsAffected: v.students.size,
      diagnosisType: diag.type,
      diagnosisMessage: diag.message,
      recommendation: diag.type === "approach" ? "Revisar a abordagem pedagógica deste tópico. Sugerir troca de estratégia, material didático ou reforço coletivo."
        : diag.type === "mixed" ? "Aplicar reforço para alunos com dificuldade e revisar a abordagem para turma como um todo."
        : "Oferecer reforço individualizado e identificar possíveis barreiras de aprendizagem específicas.",
    };
  }).sort((a, b) => b.errorRate - a.errorRate);

  // Summary insight
  const approachTopics = topicAnalysis.filter(t => t.diagnosisType === "approach");
  const individualTopics = topicAnalysis.filter(t => t.diagnosisType === "individual");
  let summary = "";
  if (approachTopics.length > 0) {
    summary = `${approachTopics.length} tópico(s) apresentam erro coletivo (>60% da turma). Isso indica possível problema de abordagem pedagógica. `;
  }
  if (individualTopics.length > 0) {
    summary += `${individualTopics.length} tópico(s) apresentam erro individual. Recomenda-se reforço personalizado.`;
  }

  res.json({
    scope: cId ? { classId: cId, className: classNameFor(classes.find(c => c.id === cId), series) } : { classId: null, className: "Toda a instituição" },
    lowStudents: lowStudents.slice(0, 10),
    topicAnalysis: topicAnalysis.slice(0, 15),
    summary,
  });
});

// ===== /reports/question-analysis =====
router.get("/question-analysis", async (req, res) => {
  const tenant = (req as any).tenant;
  const tid = tenant.id;
  const { examId } = req.query;

  if (!examId) { res.status(400).json({ error: "examId é obrigatório" }); return; }

  const exam = await db.select().from(examsTable).where(and(eq(examsTable.id, parseInt(String(examId))), eq(examsTable.tenantId, tid))).then(r => r[0]);
  if (!exam) { res.status(404).json({ error: "Prova não encontrada" }); return; }

  const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, exam.id)).orderBy(questionsTable.order);
  const topics = await db.select().from(topicsTable);
  const allAnswers = await db.select({
    answer: studentAnswersTable,
    question: questionsTable,
    option: questionOptionsTable,
    session: examSessionsTable,
  }).from(studentAnswersTable)
    .innerJoin(questionsTable, eq(studentAnswersTable.questionId, questionsTable.id))
    .leftJoin(questionOptionsTable, eq(studentAnswersTable.selectedOptionId, questionOptionsTable.id))
    .innerJoin(examSessionsTable, eq(studentAnswersTable.sessionId, examSessionsTable.id))
    .where(eq(questionsTable.examId, exam.id));

  const analysis = questions.map(q => {
    const answers = allAnswers.filter(a => a.question.id === q.id);
    const total = answers.length;
    const correct = answers.filter(a => a.answer.isCorrect).length;
    const correctRate = total > 0 ? (correct / total) * 100 : 0;
    const errorRate = total > 0 ? ((total - correct) / total) * 100 : 0;

    const byOption: Record<number, number> = {};
    for (const a of answers) {
      const optId = a.answer.selectedOptionId;
      if (optId) {
        byOption[optId] = (byOption[optId] ?? 0) + 1;
      }
    }

    const topic = topics.find(t => t.id === q.topicId);
    return {
      questionId: q.id,
      statement: q.statement,
      topicName: topic?.name ?? null,
      totalAnswers: total,
      correctRate,
      errorRate,
      byOption: Object.entries(byOption).map(([optId, count]) => ({ optionId: Number(optId), count, percentage: total > 0 ? (count / total) * 100 : 0 })),
    };
  });

  res.json({ examId: exam.id, examTitle: exam.title, analysis });
});

// ===== /reports/class-ranking =====
router.get("/class-ranking", async (req, res) => {
  const tenant = (req as any).tenant;
  const tid = tenant.id;

  const classes = await db.select().from(classesTable).where(eq(classesTable.tenantId, tid));
  const series = await db.select().from(seriesTable).where(eq(seriesTable.tenantId, tid));
  const students = await db.select().from(usersTable).where(eq(usersTable.tenantId, tid));
  const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.tenantId, tid));

  const allSessions = await db.select().from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(and(eq(examsTable.tenantId, tid), sql`exam_sessions.status = 'submitted'`));

  const rankings: any[] = [];
  for (const cls of classes) {
    const enrollments = await db.select().from(classStudentsTable).where(eq(classStudentsTable.classId, cls.id));
    const enrolled = enrollments.map(e => e.studentId);
    const classStudents = students.filter(u => u.role === "student" && enrolled.includes(u.id));
    const classSessions = allSessions.filter(s => enrolled.includes(s.exam_sessions.studentId));

    const scores = classSessions.map(s => parseFloat(String(s.exam_sessions.score ?? 0)));
    const maxScores = classSessions.map(s => parseFloat(String(s.exam_sessions.maxScore ?? 10)));
    const pcts = scores.map((sc, i) => maxScores[i] > 0 ? (sc / maxScores[i]) * 100 : 0);
    const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;

    // By subject
    const bySubject: Record<number, number[]> = {};
    for (const row of classSessions) {
      const sid = row.exams.subjectId;
      if (!sid) continue;
      if (!bySubject[sid]) bySubject[sid] = [];
      const sc = parseFloat(String(row.exam_sessions.score ?? 0));
      const mx = parseFloat(String(row.exam_sessions.maxScore ?? 10));
      bySubject[sid].push(mx > 0 ? (sc / mx) * 100 : 0);
    }
    const subjectBreakdown = subjects.map(s => {
      const arr = bySubject[s.id] ?? [];
      return { subjectId: s.id, subjectName: s.name, average: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0, count: arr.length };
    }).filter(s => s.count > 0);

    // At-risk count
    let atRiskCount = 0;
    for (const st of classStudents) {
      const stSessions = classSessions.filter(s => s.exam_sessions.studentId === st.id);
      if (stSessions.length < 2) continue;
      const points = stSessions.map((s, i) => ({
        x: i,
        y: scoreToPercent(parseFloat(String(s.exam_sessions.score ?? 0)), parseFloat(String(s.exam_sessions.maxScore ?? 10))),
      }));
      const avgPct = points.reduce((a, p) => a + p.y, 0) / points.length;
      const reg = linearRegression(points);
      const r = riskLevel(reg.slope, avgPct);
      if (r.level !== "low") atRiskCount++;
    }

    rankings.push({
      classId: cls.id,
      className: classNameFor(cls, series),
      studentsCount: classStudents.length,
      totalSessions: classSessions.length,
      averageScore: avg,
      subjectBreakdown,
      atRiskCount,
    });
  }

  rankings.sort((a, b) => b.averageScore - a.averageScore);

  res.json({ rankings });
});

// ===== /reports/student-timeline/:studentId =====
router.get("/student-timeline/:studentId", async (req, res) => {
  const tenant = (req as any).tenant;
  const tid = tenant.id;
  const studentId = parseInt(req.params.studentId);
  const student = await db.select().from(usersTable).where(and(eq(usersTable.id, studentId), eq(usersTable.tenantId, tid), eq(usersTable.role, "student"))).then(r => r[0]);
  if (!student) { res.status(404).json({ error: "Aluno não encontrado" }); return; }

  const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.tenantId, tid));
  const topics = await db.select().from(topicsTable);

  const sessions = await db.select().from(examSessionsTable)
    .innerJoin(examsTable, eq(examSessionsTable.examId, examsTable.id))
    .where(and(eq(examSessionsTable.studentId, studentId), eq(examsTable.tenantId, tid), sql`exam_sessions.status = 'submitted'`))
    .orderBy(examSessionsTable.startedAt);

  const timeline = sessions.map((s, i) => {
    const score = parseFloat(String(s.exam_sessions.score ?? 0));
    const max = parseFloat(String(s.exam_sessions.maxScore ?? 10));
    const pct = max > 0 ? (score / max) * 100 : 0;
    const subject = subjects.find(sub => sub.id === s.exams.subjectId);
    return {
      examId: s.exams.id,
      examTitle: s.exams.title,
      subjectName: subject?.name ?? "",
      date: s.exam_sessions.startedAt.toISOString(),
      score,
      maxScore: max,
      percentage: pct,
    };
  });

  // Subject-wise timeline
  const subjectTimeline: Record<number, any[]> = {};
  for (const t of timeline) {
    const exam = sessions.find(s => s.exams.id === t.examId);
    const sid = exam?.exams.subjectId;
    if (!sid) continue;
    if (!subjectTimeline[sid]) subjectTimeline[sid] = [];
    subjectTimeline[sid].push(t);
  }
  const subjectWise = Object.entries(subjectTimeline).map(([sid, arr]) => {
    const subject = subjects.find(s => s.id === Number(sid));
    const avgs = arr.map(a => a.percentage);
    const avg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
    const points = avgs.map((y, x) => ({ x, y }));
    const reg = linearRegression(points);
    const r = riskLevel(reg.slope, avg);
    return {
      subjectId: Number(sid),
      subjectName: subject?.name ?? "",
      average: avg,
      trendSlope: reg.slope,
      trendR2: reg.r2,
      riskLevel: r.level,
      riskLabel: r.label,
      riskColor: r.color,
      exams: arr,
    };
  });

  // Overall trend
  const overallPoints = timeline.map((t, i) => ({ x: i, y: t.percentage }));
  const overallReg = linearRegression(overallPoints);
  const overallAvg = overallPoints.reduce((a, p) => a + p.y, 0) / overallPoints.length;
  const overallRisk = riskLevel(overallReg.slope, overallAvg);

  res.json({
    studentId,
    studentName: student.name,
    timeline,
    subjectWise,
    overall: {
      average: overallAvg,
      trendSlope: overallReg.slope,
      trendR2: overallReg.r2,
      riskLevel: overallRisk.level,
      riskLabel: overallRisk.label,
      riskColor: overallRisk.color,
    },
  });
});

export default router;
