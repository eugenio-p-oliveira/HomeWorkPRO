import { db, pool, usersTable, guardiansTable, studentGuardiansTable, parentMessagesTable, schoolEventsTable, parentTipsTable, subjectsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

const TENANT_ID = 1;

function hashPassword(p: string) {
  return crypto.createHash("sha256").update(p + "edusaas_salt").digest("hex");
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysFromNow(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); return d;
}

const GUARDIANS = [
  { name: "Maria Alves", email: "maria.alves@teste.com", phone: "(11) 98765-1234" },
  { name: "João Ferreira", email: "joao.ferreira@teste.com", phone: "(11) 98765-2345" },
  { name: "Rosa Santos", email: "rosa.santos@teste.com", phone: "(11) 98765-3456" },
  { name: "Carlos Oliveira", email: "carlos.oliveira@teste.com", phone: "(11) 98765-4567" },
  { name: "Fernanda Lima", email: "fernanda.lima@teste.com", phone: "(11) 98765-5678" },
  { name: "Pedro Pereira", email: "pedro.pereira@teste.com", phone: "(11) 98765-6789" },
  { name: "Ana Costa", email: "ana.costa@teste.com", phone: "(11) 98765-7890" },
  { name: "Roberto Martins", email: "roberto.martins@teste.com", phone: "(11) 98765-8901" },
  { name: "Juliana Ribeiro", email: "juliana.ribeiro@teste.com", phone: "(11) 98765-9012" },
  { name: "Lucas Silva", email: "lucas.silva@teste.com", phone: "(11) 98765-0123" },
  { name: "Clara Souza", email: "clara.souza@teste.com", phone: "(11) 98765-1122" },
  { name: "Antonio Rocha", email: "antonio.rocha@teste.com", phone: "(11) 98765-2233" },
  { name: "Beatriz Mendes", email: "beatriz.mendes@teste.com", phone: "(11) 98765-3344" },
  { name: "Daniel Carvalho", email: "daniel.carvalho@teste.com", phone: "(11) 98765-4455" },
  { name: "Rafaela Torres", email: "rafaela.torres@teste.com", phone: "(11) 98765-5566" },
  { name: "Sérgio Nascimento", email: "sergio.nascimento@teste.com", phone: "(11) 98765-6677" },
  { name: "Tábata Lopes", email: "tabata.lopes@teste.com", phone: "(11) 98765-7788" },
  { name: "Ulisses Gomes", email: "ulisses.gomes@teste.com", phone: "(11) 98765-8899" },
  { name: "Valentina Cruz", email: "valentina.cruz@teste.com", phone: "(11) 98765-9900" },
  { name: "William Araujo", email: "william.araujo@teste.com", phone: "(11) 98765-0011" },
  { name: "Amanda Neves", email: "amanda.neves@teste.com", phone: "(11) 98765-1133" },
  { name: "Bruno Correia", email: "bruno.correia@teste.com", phone: "(11) 98765-2244" },
  { name: "Claudia Freitas", email: "claudia.freitas@teste.com", phone: "(11) 98765-3355" },
  { name: "Diego Barbosa", email: "diego.barbosa@teste.com", phone: "(11) 98765-4466" },
  { name: "Elaine Cardoso", email: "elaine.cardoso@teste.com", phone: "(11) 98765-5577" },
  { name: "Felipe Moreira", email: "felipe.moreira@teste.com", phone: "(11) 98765-6688" },
  { name: "Gabriela Teixeira", email: "gabriela.teixeira@teste.com", phone: "(11) 98765-7799" },
  { name: "Henrique Pinto", email: "henrique.pinto@teste.com", phone: "(11) 98765-8800" },
  { name: "Isabela Fontes", email: "isabela.fontes@teste.com", phone: "(11) 98765-9911" },
  { name: "Joao Cavalcanti", email: "joao.cavalcanti@teste.com", phone: "(11) 98765-1022" },
  { name: "Alice Duarte", email: "alice.duarte@teste.com", phone: "(11) 98765-2133" },
  { name: "Bruno Faria", email: "bruno.faria@teste.com", phone: "(11) 98765-3244" },
  { name: "Camila Esteves", email: "camila.esteves@teste.com", phone: "(11) 98765-4355" },
  { name: "Davi Lemos", email: "davi.lemos@teste.com", phone: "(11) 98765-5466" },
  { name: "Eduarda Pinheiro", email: "eduarda.pinheiro@teste.com", phone: "(11) 98765-6577" },
];

async function main() {
  console.log("🌱 Seed de responsáveis...\n");

  // ── 1. RESPONSÁVEIS ─────────────────────────────────────────────────────────────────────
  const existingGuardians = await db.select().from(guardiansTable).where(sql`tenant_id = ${TENANT_ID}`);
  const existingMap = new Map(existingGuardians.map(g => [g.email, g]));
  const guardianIds: number[] = [];
  for (const g of GUARDIANS) {
    if (existingMap.has(g.email)) {
      guardianIds.push(existingMap.get(g.email)!.id);
      continue;
    }
    const [guardian] = await db.insert(guardiansTable).values({
      tenantId: TENANT_ID, name: g.name, email: g.email, phone: g.phone,
      passwordHash: hashPassword("senha123"),
    }).returning();
    guardianIds.push(guardian.id);
    console.log(`  + Responsável: ${g.name}`);
  }

  // ── 2. VINCULAR ALUNOS A RESPONSÁVEIS ────────────────────────────────────────
  const students = await db.select().from(usersTable).where(sql`tenant_id = ${TENANT_ID} AND role = 'student'`);
  const existingLinks = await db.select().from(studentGuardiansTable);
  const existingLinkSet = new Set(existingLinks.map(l => `${l.studentId}-${l.guardianId}`));
  const relations: any[] = ["parent", "parent", "parent", "stepparent", "grandparent", "guardian", "other"];
  let linkCount = 0;
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const guardianId = guardianIds[i % guardianIds.length];
    const key = `${student.id}-${guardianId}`;
    if (existingLinkSet.has(key)) continue;
    await db.insert(studentGuardiansTable).values({
      studentId: student.id, guardianId,
      relation: relations[i % relations.length],
    });
    linkCount++;
  }
  console.log(`  + ${linkCount} vínculos aluno-responsável`);

  // ── 3. EVENTOS ESCOLARES ──────────────────────────────────────────────────────
  const existingEvents = await db.select().from(schoolEventsTable).where(sql`tenant_id = ${TENANT_ID}`);
  if (existingEvents.length === 0) {
    const events = [
      { title: "Simulado ENEM Geral", description: "Simulado completo para todos os 3° anos", eventType: "exam" as const, startsAt: daysFromNow(7), endsAt: daysFromNow(7), isAllDay: false },
      { title: "Reunião de Pais — 1° bimestre", description: "Apresentação dos resultados do 1° bimestre", eventType: "parent_meeting" as const, startsAt: daysFromNow(14), isAllDay: false },
      { title: "Festa Junina", description: "Comemoração tradicional com apresentações dos alunos", eventType: "cultural" as const, startsAt: daysFromNow(20), isAllDay: true },
      { title: "Interclasse de Futebol", description: "Campeonato esportivo entre turmas", eventType: "sports" as const, startsAt: daysFromNow(25), isAllDay: false },
      { title: "Reunião Pedagógica", description: "Reunião com professores e coordenação", eventType: "parent_meeting" as const, startsAt: daysFromNow(5), isAllDay: false },
      { title: "Dia do Professor", description: "Comemoração institucional", eventType: "other" as const, startsAt: daysFromNow(30), isAllDay: true },
      { title: "Prazo de Entrega — Provas Bimestrais", description: "Último dia para correção e lançamento de notas", eventType: "deadline" as const, startsAt: daysFromNow(10), isAllDay: true },
      { title: "Prova Bimestral — Português", description: "Prova escrita para turmas do 2° ano", eventType: "exam" as const, startsAt: daysFromNow(11), isAllDay: false },
      { title: "Feriado — Corpus Christi", description: "Ponto facultativo — sem aula", eventType: "holiday" as const, startsAt: daysFromNow(16), isAllDay: true },
      { title: "Avaliação Diagnóstica — 9° ano", description: "Avaliação de conhecimentos prévios", eventType: "exam" as const, startsAt: daysFromNow(3), isAllDay: false },
    ];
    for (const e of events) {
      await db.insert(schoolEventsTable).values({ tenantId: TENANT_ID, ...e });
    }
    console.log(`  + ${events.length} eventos escolares`);
  } else {
    console.log(`  (já existem ${existingEvents.length} eventos, pulando)`);
  }

  // ── 4. DICAS PARA PAIS ────────────────────────────────────────────────────────────────
  const existingTips = await db.select().from(parentTipsTable).where(sql`tenant_id = ${TENANT_ID}`);
  if (existingTips.length === 0) {
    const subjects = await db.select().from(subjectsTable).where(sql`tenant_id = ${TENANT_ID}`);
    const tips = [
      { title: "Como ajudar seu filho na Matemática", content: "Estimule a resolução de problemas do cotidiano. Peça que ele calcule o troco no mercado, meça ingredientes na cozinha ou calcule o tempo de uma viagem. A matemática está em tudo!", subjectId: subjects.find(s => s.name === "Matemática")?.id ?? null },
      { title: "Física na prática: experiências em casa", content: "Monte experiências simples em casa: um balão com eletricidade estática (esfregando no cabelo), uma garrafa d'agua para mostrar pressão, ou um carrinho de rolimã para demonstrar inércia. A prática fixa a teoria!", subjectId: subjects.find(s => s.name === "Física")?.id ?? null },
      { title: "Química: cuidados com produtos de limpeza", content: "Explique a reação química por trás do bicarbonato de sódio com vinagre. Peça que ele leia os rótulos de produtos e identifique ácidos e bases. Isso conecta a teoria à vida real.", subjectId: subjects.find(s => s.name === "Química")?.id ?? null },
      { title: "História: passeios culturais e museus", content: "Visite museus, monumentos históricos ou locais com significado histórico. A história viva é muito mais memorável que livros. Converse sobre os porquês de cada acontecimento.", subjectId: subjects.find(s => s.name === "História")?.id ?? null },
      { title: "Biologia: uma planta em casa", content: "Plante uma semente com seu filho. Acompanhe o crescimento, fotossíntese, raízes e brota. É a melhor forma de entender a vida das plantas e a importância da água e luz.", subjectId: subjects.find(s => s.name === "Biologia")?.id ?? null },
      { title: "Geografia: mapas e viagens virtuais", content: "Use mapas digitais e programe uma 'viagem' para um país. Estude o clima, a cultura, a economia. Use o Google Earth para visitar a Amazônia ou Patagônia. O mundo na tela!", subjectId: subjects.find(s => s.name === "Geografia")?.id ?? null },
      { title: "Português: leitura conjunta", content: "Leia o mesmo livro que seu filho. Troque opiniões sobre personagens e tramas. Peça que ele resuma o capítulo para você. A leitura se torna um momento de conexão.", subjectId: subjects.find(s => s.name === "Língua Portuguesa")?.id ?? null },
      { title: "Rotina de estudos: o ambiente ideal", content: "Crie um espaço dedicado para estudos, com luz adequada, sem distrações. Estabeleça horários fixos e intervalos. A consistência é mais importante que a intensidade.", subjectId: null },
      { title: "Gestão do tempo: o método Pomodoro", content: "Ensine seu filho a estudar em blocos de 25 minutos com 5 minutos de pausa. Isso aumenta a concentração e previne a fadiga mental. Use um timer de cozinha!", subjectId: null },
      { title: "Ansiedade antes de provas: como apoiar", content: "Converse sobre expectativas realistas. Elogie o esforço, não apenas a nota. Durma bem, alimente-se e evite estudar até tarde. O equilíbrio é a chave.", subjectId: null },
      { title: "Seu filho está com dificuldade? O que fazer", content: "Identifique a disciplina com menor aproveitamento. Não reprimenda. Contrate um reforço, converse com o professor, crie metas pequenas. O progresso vem aos poucos.", subjectId: null },
      { title: "Alimentação e desempenho escolar", content: "Café da manhã completo, lanches leves e muita água. Evite doces excessivos antes de estudar. Cereais, frutas e proteínas ajudam a manter a atenção por mais tempo.", subjectId: null },
    ];
    for (const t of tips) {
      await db.insert(parentTipsTable).values({ tenantId: TENANT_ID, ...t });
    }
    console.log(`  + ${tips.length} dicas para pais`);
  } else {
    console.log(`  (já existem ${existingTips.length} dicas, pulando)`);
  }

  // ── 5. MENSAGENS PARA RESPONSÁVEIS ────────────────────────────────────────────────────
  const existingMessages = await db.select().from(parentMessagesTable).where(sql`tenant_id = ${TENANT_ID}`);
  if (existingMessages.length === 0) {
    const teachers = await db.select().from(usersTable).where(sql`tenant_id = ${TENANT_ID} AND role = 'teacher'`);
    const teacherIds = teachers.map(t => t.id);
    const msgs = [
      { type: "exam_alert" as const, title: "Prova de Física amanhã", body: "Seu filho tem a Prova de Física — Eletromagnetismo amanhã. Lembre-se de revisar o conteúdo de circuitos e Ohm. Tempo de estudo recomendado: 45 minutos esta noite.", daysBack: 0 },
      { type: "exam_alert" as const, title: "Simulado de Matemática disponível", body: "O Simulado de Matemática — 3° ano está aberto. A prova tem duração de 60 minutos e pode ser feita até sexta-feira.", daysBack: 1 },
      { type: "exam_result" as const, title: "Resultado: Prova de História", body: "Seu filho concluiu a Prova de História com aproveitamento de 85%. Parabéns! Aproveitamento acima da média da turma.", daysBack: 2 },
      { type: "exam_result" as const, title: "Resultado: Prova de Química", body: "Seu filho concluiu a Prova de Química com aproveitamento de 62%. Recomendação: reforço em Ligações Químicas.", daysBack: 3 },
      { type: "activity_reminder" as const, title: "Atividade de Química pendente", body: "A Atividade de Química — 2° ano ainda não foi entregue. Prazo final: esta sexta-feira.", daysBack: 1 },
      { type: "general_tip" as const, title: "Dica: Como ajudar em Matemática", body: "Estimule a resolução de problemas do cotidiano. Peça que seu filho calcule o troco no mercado ou meça ingredientes na cozinha.", daysBack: 5 },
      { type: "general_tip" as const, title: "Dica: Física na prática", body: "Monte experiências simples: balão com eletricidade estática, garrafa d'agua para mostrar pressão. A prática fixa a teoria!", daysBack: 7 },
      { type: "general_tip" as const, title: "Dica: Rotina de estudos", body: "Crie um espaço dedicado, sem distrações. Estabeleça horários fixos e intervalos. Consistência é mais importante que intensidade.", daysBack: 10 },
      { type: "custom_message" as const, title: "Reunião de Pais — 14/06", body: "Convidamos todos os responsáveis para a reunião de apresentação dos resultados do 1° bimestre.", daysBack: 4 },
      { type: "custom_message" as const, title: "Festa Junina — 20/06", body: "Nossa tradicional Festa Junina será no próximo dia 20. Contamos com a participação de todos!", daysBack: 6 },
      { type: "exam_alert" as const, title: "Avaliação Diagnóstica na próxima semana", body: "O aluno terá uma avaliação diagnóstica de Química. A prova é para identificar pontos de melhoria.", daysBack: 2 },
      { type: "custom_message" as const, title: "Bem-vindo ao portal de responsáveis", body: "Agora você pode acompanhar o desempenho do seu filho, receber alertas de provas e dicas pedagógicas.", daysBack: 15 },
    ];
    // Create messages for first 3 guardians linked to students
    const links = await db.select().from(studentGuardiansTable);
    const gIds = [...new Set(links.slice(0, 6).map(l => l.guardianId))];
    const sIds = [...new Set(links.slice(0, 6).map(l => l.studentId))];
    let msgCount = 0;
    for (let i = 0; i < msgs.length; i++) {
      const gId = gIds[i % gIds.length];
      const sId = sIds[i % sIds.length];
      const senderId = teacherIds[i % teacherIds.length] ?? ADMIN_ID;
      await db.insert(parentMessagesTable).values({
        tenantId: TENANT_ID, guardianId: gId, studentId: sId, senderId,
        type: msgs[i].type, title: msgs[i].title, body: msgs[i].body,
        isRead: i < 3, // 3 lidas
        createdAt: new Date(Date.now() - msgs[i].daysBack * 86400000 + rand(0, 3600000)),
      } as any);
      msgCount++;
    }
    console.log(`  + ${msgCount} mensagens para responsáveis`);
  } else {
    console.log(`  (já existem ${existingMessages.length} mensagens, pulando)`);
  }

  console.log("\n✅ Seed de responsáveis concluído!");
  await pool.end();
}

main().catch(e => { console.error("❌ Erro:", e); process.exit(1); });
