import {
  db,
  usersTable, tenantsTable,
  subjectsTable, seriesTable, classesTable, classStudentsTable,
  examsTable, questionsTable, questionOptionsTable,
  guardiansTable, studentGuardiansTable,
} from "@workspace/db";
import { eq, sql } from "@workspace/db";
import { hashPassword } from "./lib/auth";

const TENANT_ID = 1;
const NOW = new Date();

function daysAgo(n: number) {
  const d = new Date(NOW); d.setDate(d.getDate() - n); return d;
}
function daysFromNow(n: number) {
  const d = new Date(NOW); d.setDate(d.getDate() + n); return d;
}

const TEACHERS = [
  { name: "Prof. Carlos Mendes", email: "carlos.mendes@escolateste.com" },
  { name: "Profa. Ana Rodrigues", email: "ana.rodrigues@escolateste.com" },
  { name: "Prof. Roberto Lima", email: "roberto.lima@escolateste.com" },
  { name: "Profa. Fernanda Costa", email: "fernanda.costa@escolateste.com" },
];

const STUDENTS = [
  "Beatriz Alves","Caio Ferreira","Daniela Santos","Eduardo Oliveira","Fernanda Lima",
  "Gustavo Pereira","Helena Costa","Igor Martins","Juliana Ribeiro","Lucas Silva",
  "Mariana Souza","Nicolas Rocha","Olivia Mendes","Pedro Carvalho","Rafaela Torres",
  "Samuel Nascimento","Tabata Lopes","Ulisses Gomes","Valentina Cruz","William Araujo",
];

const SUBJECTS = ["Matematica","Portugues","Historia","Geografia","Ciencias","Ingles"];

async function ensureTenant() {
  const [existing] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, TENANT_ID));
  if (existing) return existing;
  const [tenant] = await db.insert(tenantsTable).values({
    name: "Escola Teste Demo",
    slug: "escola-teste-demo",
    plan: "premium",
    educationalLevels: ["fundamental", "medio"],
  }).returning();
  await db.insert(usersTable).values({
    tenantId: TENANT_ID, name: "Administrador", email: "admin@teste.com",
    passwordHash: await hashPassword("senha123"), role: "admin",
  }).returning();
  return tenant;
}

async function seedTeachers() {
  const ids: number[] = [];
  for (const t of TEACHERS) {
    const ex = await db.select({ id: usersTable.id }).from(usersTable)
      .where(sql`email = ${t.email} AND tenant_id = ${TENANT_ID}`);
    if (ex.length) { ids.push(ex[0].id); continue; }
    const [u] = await db.insert(usersTable).values({
      tenantId: TENANT_ID, name: t.name, email: t.email,
      passwordHash: await hashPassword("senha123"), role: "teacher",
    }).returning();
    ids.push(u.id);
  }
  return ids;
}

async function seedStudents() {
  const ids: number[] = [];
  for (const s of STUDENTS) {
    const email = s.toLowerCase().replace(/\s+/g, ".") + "@aluno.escolateste.com";
    const ex = await db.select({ id: usersTable.id }).from(usersTable)
      .where(sql`email = ${email} AND tenant_id = ${TENANT_ID}`);
    if (ex.length) { ids.push(ex[0].id); continue; }
    const [u] = await db.insert(usersTable).values({
      tenantId: TENANT_ID, name: s, email,
      passwordHash: await hashPassword("senha123"), role: "student",
    }).returning();
    ids.push(u.id);
  }
  return ids;
}

async function seedSubjects() {
  const ids: number[] = [];
  for (const name of SUBJECTS) {
    const ex = await db.select({ id: subjectsTable.id }).from(subjectsTable)
      .where(sql`name = ${name} AND tenant_id = ${TENANT_ID}`);
    if (ex.length) { ids.push(ex[0].id); continue; }
    const [s] = await db.insert(subjectsTable).values({
      tenantId: TENANT_ID, name,
    }).returning();
    ids.push(s.id);
  }
  return ids;
}

async function seedSeriesAndClasses(teacherIds: number[]) {
  const exSeries = await db.select({ id: seriesTable.id }).from(seriesTable)
    .where(sql`name = '9º Ano' AND tenant_id = ${TENANT_ID}`);
  let series9Id = exSeries[0]?.id;
  if (!series9Id) {
    const [s] = await db.insert(seriesTable).values({
      tenantId: TENANT_ID, name: "9º Ano", educationalLevel: "fundamental", order: 9,
    }).returning();
    series9Id = s.id;
  }

  const exClass = await db.select({ id: classesTable.id }).from(classesTable)
    .where(sql`name = '9º A' AND tenant_id = ${TENANT_ID}`);
  let classAId = exClass[0]?.id;
  if (!classAId) {
    const [c] = await db.insert(classesTable).values({
      tenantId: TENANT_ID, name: "9º A", serieId: series9Id, shift: "manha", year: 2026,
    }).returning();
    classAId = c.id;
  }
  return { series9Id, classAId };
}

async function enrollStudents(classId: number, studentIds: number[]) {
  const existing = await db.select({ studentId: classStudentsTable.studentId })
    .from(classStudentsTable).where(eq(classStudentsTable.classId, classId));
  const existingSet = new Set(existing.map(e => e.studentId));
  const toEnroll = studentIds.filter(id => !existingSet.has(id));
  if (toEnroll.length) {
    await db.insert(classStudentsTable).values(toEnroll.map(id => ({
      classId, studentId: id,
    })));
  }
}

async function seedExams(subjectIds: number[], teacherIds: number[], classId: number) {
  const existing = await db.select({ id: examsTable.id }).from(examsTable)
    .where(sql`tenant_id = ${TENANT_ID}`);
  if (existing.length >= 3) return;

  const examTemplates = [
    { title: "Prova de Matematica -- 9º Ano", subjectId: subjectIds[0], type: "traditional" as const, status: "active" as const },
    { title: "Simulado ENEM -- Linguagens", subjectId: subjectIds[1], type: "simulado" as const, status: "scheduled" as const },
    { title: "Atividade de Ciencias", subjectId: subjectIds[4], type: "homework" as const, status: "active" as const },
  ];

  for (let i = 0; i < examTemplates.length; i++) {
    const tmpl = examTemplates[i];
    const [exam] = await db.insert(examsTable).values({
      tenantId: TENANT_ID, title: tmpl.title, subjectId: tmpl.subjectId,
      type: tmpl.type, classId,
      createdById: teacherIds[i % teacherIds.length],
      timeLimitMinutes: 60,
      status: tmpl.status,
      startsAt: i === 1 ? daysFromNow(7) : daysAgo(2),
      endsAt: i === 1 ? daysFromNow(14) : daysFromNow(30),
      maxAttempts: i === 2 ? 3 : 1,
      isPublic: true,
    }).returning();

    for (let q = 0; q < 5; q++) {
      const [question] = await db.insert(questionsTable).values({
        examId: exam.id,
        type: "multiple_choice",
        statement: `Questao ${q + 1} da ${tmpl.title}`,
        points: 2,
        order: q,
      }).returning();

      await db.insert(questionOptionsTable).values([
        { questionId: question.id, text: "Alternativa A (correta)", letter: "A", isCorrect: true },
        { questionId: question.id, text: "Alternativa B", letter: "B", isCorrect: false },
        { questionId: question.id, text: "Alternativa C", letter: "C", isCorrect: false },
        { questionId: question.id, text: "Alternativa D", letter: "D", isCorrect: false },
      ]);
    }
  }
}

async function ensureDemoGuardian() {
  const [existingGuardian] = await db
    .select()
    .from(guardiansTable)
    .where(eq(guardiansTable.email, "maria.alves@teste.com"));

  if (existingGuardian) return;

  const [student] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(sql`tenant_id = ${TENANT_ID} AND role = 'student'`)
    .limit(1);

  if (!student) return;

  const [guardian] = await db
    .insert(guardiansTable)
    .values({
      tenantId: TENANT_ID,
      name: "Maria Alves",
      email: "maria.alves@teste.com",
      phone: "(11) 98765-1234",
      passwordHash: await hashPassword("senha123"),
    })
    .returning();

  await db.insert(studentGuardiansTable).values({
    studentId: student.id,
    guardianId: guardian.id,
    relation: "parent",
  });
}

export async function autoSeedIfEmpty() {
  const [anyTenant] = await db.select({ id: tenantsTable.id }).from(tenantsTable).limit(1);
  if (!anyTenant) {
    console.log("[auto-seed] Database empty -- seeding demo data...");

    await ensureTenant();
    const teacherIds = await seedTeachers();
    const studentIds = await seedStudents();
    const subjectIds = await seedSubjects();
    const { classAId } = await seedSeriesAndClasses(teacherIds);
    await enrollStudents(classAId, studentIds);
    await seedExams(subjectIds, teacherIds, classAId);

    console.log("[auto-seed] Demo data seeded successfully");
  }

  await ensureDemoGuardian();
  return !anyTenant;
}
