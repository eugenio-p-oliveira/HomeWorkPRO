import {
  db, pool,
  usersTable, tenantsTable,
  subjectsTable, topicsTable, seriesTable, classesTable, classStudentsTable,
  examsTable, questionsTable, questionOptionsTable,
  examSessionsTable, studentAnswersTable, activityLogTable,
} from "@workspace/db";
import { eq, sql, inArray } from "drizzle-orm";
import crypto from "crypto";

const TENANT_ID = 1;
const ADMIN_ID = 1;
const NOW = new Date();

function hashPassword(p: string) {
  return crypto.createHash("sha256").update(p).digest("hex");
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}

// ─── DADOS ────────────────────────────────────────────────────────────────────

const TEACHERS = [
  { name: "Prof. Carlos Mendes",     email: "carlos.mendes@escolateste.com" },
  { name: "Profa. Ana Rodrigues",    email: "ana.rodrigues@escolateste.com" },
  { name: "Prof. Roberto Lima",      email: "roberto.lima@escolateste.com" },
  { name: "Profa. Fernanda Costa",   email: "fernanda.costa@escolateste.com" },
];

const STUDENTS_3A = [
  "Beatriz Alves","Caio Ferreira","Daniela Santos","Eduardo Oliveira","Fernanda Lima",
  "Gustavo Pereira","Helena Costa","Igor Martins","Juliana Ribeiro","Lucas Silva",
  "Mariana Souza","Nicolas Rocha","Olívia Mendes","Pedro Carvalho","Rafaela Torres",
  "Samuel Nascimento","Tábata Lopes","Ulisses Gomes","Valentina Cruz","William Araujo",
];

const STUDENTS_3B = [
  "Amanda Neves","Breno Correia","Cláudia Freitas","Diego Barbosa","Elaine Cardoso",
  "Felipe Moreira","Gabriela Teixeira","Henrique Pinto","Isabela Fontes","João Cavalcanti",
  "Karen Batista","Leonardo Dias","Mônica Vieira","Nathan Figueiredo","Patricia Ramos",
  "Quirino Azevedo","Renata Machado","Sérgio Borges","Tatiana Andrade","Victor Campos",
];

const STUDENTS_2A = [
  "André Marques","Bianca Pires","César Cunha","Diana Brito","Emanuel Salves",
  "Flávia Queiroz","Geraldo Matos","Heloísa Rezende","Ivan Paiva","Josefina Abreu",
  "Kleber Monteiro","Laura Sampaio","Marcos Vasconcelos","Nayara Brandão","Otávio Nogueira",
  "Paula Medeiros","Quézia Tavares","Rogério Almeida","Suzana Guimarães","Thiago Barreto",
];

const SUBJECTS_DATA = [
  { name: "Matemática",        color: "#3B82F6", topics: ["Álgebra","Geometria","Trigonometria","Estatística","Funções","Progressões","Matrizes e Determinantes"] },
  { name: "Língua Portuguesa", color: "#8B5CF6", topics: ["Gramática","Interpretação de Texto","Redação","Literatura Brasileira","Figuras de Linguagem","Ortografia"] },
  { name: "Física",            color: "#F59E0B", topics: ["Mecânica","Termodinâmica","Óptica","Eletromagnetismo","Ondas","Cinemática","Dinâmica"] },
  { name: "Química",           color: "#10B981", topics: ["Química Orgânica","Estequiometria","Ligações Químicas","Tabela Periódica","Reações Químicas","Soluções"] },
  { name: "Biologia",          color: "#EF4444", topics: ["Citologia","Genética","Ecologia","Evolução","Fisiologia","Botânica","Zoologia"] },
  { name: "História",          color: "#F97316", topics: ["Brasil Colônia","Brasil Império","Brasil República","História Geral","Segunda Guerra","Revolução Industrial"] },
  { name: "Geografia",         color: "#06B6D4", topics: ["Geopolítica","Cartografia","Clima e Vegetação","Urbanização","Demografía","Geologia"] },
];

// ─── Questões por disciplina ───────────────────────────────────────────────

type QData = { statement: string; options: { text: string; letter: string; isCorrect: boolean }[]; explanation: string; topicIdx: number };

const QUESTIONS_MATEMATICA: QData[] = [
  { statement: "Se f(x) = 2x² − 3x + 1, qual o valor de f(2)?", topicIdx: 4,
    explanation: "f(2) = 2(4) − 3(2) + 1 = 8 − 6 + 1 = 3",
    options: [
      { letter:"A", text:"1",  isCorrect:false }, { letter:"B", text:"2",  isCorrect:false },
      { letter:"C", text:"3",  isCorrect:true  }, { letter:"D", text:"4",  isCorrect:false },
      { letter:"E", text:"5",  isCorrect:false }]},
  { statement: "A soma dos ângulos internos de um pentágono é:", topicIdx: 1,
    explanation: "(5−2)×180 = 540°",
    options: [
      { letter:"A", text:"360°", isCorrect:false }, { letter:"B", text:"450°", isCorrect:false },
      { letter:"C", text:"540°", isCorrect:true  }, { letter:"D", text:"630°", isCorrect:false },
      { letter:"E", text:"720°", isCorrect:false }]},
  { statement: "A PA (2, 5, 8, ...) tem razão:", topicIdx: 5,
    explanation: "r = 5 − 2 = 3",
    options: [
      { letter:"A", text:"1", isCorrect:false }, { letter:"B", text:"2", isCorrect:false },
      { letter:"C", text:"3", isCorrect:true  }, { letter:"D", text:"4", isCorrect:false },
      { letter:"E", text:"5", isCorrect:false }]},
  { statement: "O determinante da matriz [[3,1],[2,4]] é:", topicIdx: 6,
    explanation: "det = 3×4 − 1×2 = 12 − 2 = 10",
    options: [
      { letter:"A", text:"8",  isCorrect:false }, { letter:"B", text:"10", isCorrect:true  },
      { letter:"C", text:"12", isCorrect:false }, { letter:"D", text:"14", isCorrect:false },
      { letter:"E", text:"16", isCorrect:false }]},
  { statement: "Quantos são os divisores de 36?", topicIdx: 0,
    explanation: "36 = 2²×3². Divisores: (2+1)(2+1) = 9",
    options: [
      { letter:"A", text:"6",  isCorrect:false }, { letter:"B", text:"7",  isCorrect:false },
      { letter:"C", text:"8",  isCorrect:false }, { letter:"D", text:"9",  isCorrect:true  },
      { letter:"E", text:"12", isCorrect:false }]},
  { statement: "O valor de sen(30°) é:", topicIdx: 2,
    explanation: "sen(30°) = 1/2",
    options: [
      { letter:"A", text:"√2/2", isCorrect:false }, { letter:"B", text:"√3/2", isCorrect:false },
      { letter:"C", text:"1",    isCorrect:false }, { letter:"D", text:"1/2",  isCorrect:true  },
      { letter:"E", text:"0",    isCorrect:false }]},
  { statement: "A média aritmética de {4, 8, 12, 16} é:", topicIdx: 3,
    explanation: "Média = (4+8+12+16)/4 = 40/4 = 10",
    options: [
      { letter:"A", text:"8",  isCorrect:false }, { letter:"B", text:"9",  isCorrect:false },
      { letter:"C", text:"10", isCorrect:true  }, { letter:"D", text:"11", isCorrect:false },
      { letter:"E", text:"12", isCorrect:false }]},
  { statement: "Qual é a equação da reta que passa por (0,2) com inclinação 3?", topicIdx: 4,
    explanation: "y = 3x + 2",
    options: [
      { letter:"A", text:"y = 2x + 3", isCorrect:false }, { letter:"B", text:"y = 3x − 2", isCorrect:false },
      { letter:"C", text:"y = 3x + 2", isCorrect:true  }, { letter:"D", text:"y = x + 3",  isCorrect:false },
      { letter:"E", text:"y = 2x − 3", isCorrect:false }]},
  { statement: "O 10º termo da PA (1, 4, 7, ...) é:", topicIdx: 5,
    explanation: "a₁₀ = 1 + (10−1)×3 = 1 + 27 = 28",
    options: [
      { letter:"A", text:"25", isCorrect:false }, { letter:"B", text:"27", isCorrect:false },
      { letter:"C", text:"28", isCorrect:true  }, { letter:"D", text:"29", isCorrect:false },
      { letter:"E", text:"30", isCorrect:false }]},
  { statement: "A área de um triângulo de base 8 e altura 5 é:", topicIdx: 1,
    explanation: "A = (8×5)/2 = 20",
    options: [
      { letter:"A", text:"15", isCorrect:false }, { letter:"B", text:"18", isCorrect:false },
      { letter:"C", text:"20", isCorrect:true  }, { letter:"D", text:"22", isCorrect:false },
      { letter:"E", text:"40", isCorrect:false }]},
];

const QUESTIONS_FISICA: QData[] = [
  { statement: "Um objeto em MRU percorre 150 m em 30 s. Qual sua velocidade?", topicIdx: 5,
    explanation: "v = Δs/Δt = 150/30 = 5 m/s",
    options: [
      { letter:"A", text:"3 m/s",  isCorrect:false }, { letter:"B", text:"4 m/s",  isCorrect:false },
      { letter:"C", text:"5 m/s",  isCorrect:true  }, { letter:"D", text:"6 m/s",  isCorrect:false },
      { letter:"E", text:"10 m/s", isCorrect:false }]},
  { statement: "A segunda Lei de Newton estabelece que F = ?", topicIdx: 6,
    explanation: "F = m.a — força é o produto de massa pela aceleração",
    options: [
      { letter:"A", text:"m/a",   isCorrect:false }, { letter:"B", text:"m.v",   isCorrect:false },
      { letter:"C", text:"m.a",   isCorrect:true  }, { letter:"D", text:"m.g",   isCorrect:false },
      { letter:"E", text:"a/m",   isCorrect:false }]},
  { statement: "A unidade de medida de energia no SI é:", topicIdx: 1,
    explanation: "A unidade de energia no SI é o Joule (J)",
    options: [
      { letter:"A", text:"Newton",  isCorrect:false }, { letter:"B", text:"Watt",   isCorrect:false },
      { letter:"C", text:"Pascal",  isCorrect:false }, { letter:"D", text:"Joule",  isCorrect:true  },
      { letter:"E", text:"Coulomb", isCorrect:false }]},
  { statement: "Qual é a velocidade da luz no vácuo?", topicIdx: 2,
    explanation: "c ≈ 3×10⁸ m/s",
    options: [
      { letter:"A", text:"3×10⁶ m/s", isCorrect:false }, { letter:"B", text:"3×10⁷ m/s", isCorrect:false },
      { letter:"C", text:"3×10⁸ m/s", isCorrect:true  }, { letter:"D", text:"3×10⁹ m/s", isCorrect:false },
      { letter:"E", text:"3×10⁵ m/s", isCorrect:false }]},
  { statement: "Em um circuito com V = 12V e R = 4Ω, a corrente é:", topicIdx: 3,
    explanation: "I = V/R = 12/4 = 3 A",
    options: [
      { letter:"A", text:"1 A", isCorrect:false }, { letter:"B", text:"2 A", isCorrect:false },
      { letter:"C", text:"3 A", isCorrect:true  }, { letter:"D", text:"4 A", isCorrect:false },
      { letter:"E", text:"6 A", isCorrect:false }]},
  { statement: "A dilatação dos corpos quando aquecidos é estudada pela:", topicIdx: 1,
    explanation: "A Termologia/Termometria estuda os efeitos do calor nos corpos",
    options: [
      { letter:"A", text:"Óptica",          isCorrect:false }, { letter:"B", text:"Mecânica",       isCorrect:false },
      { letter:"C", text:"Termodinâmica",   isCorrect:true  }, { letter:"D", text:"Eletrostática",  isCorrect:false },
      { letter:"E", text:"Ondulatória",     isCorrect:false }]},
  { statement: "Qual fenômeno explica por que vemos objetos com cores?", topicIdx: 2,
    explanation: "A dispersão da luz (decomposta pelo prisma) explica as cores",
    options: [
      { letter:"A", text:"Reflexão",   isCorrect:false }, { letter:"B", text:"Refração",    isCorrect:false },
      { letter:"C", text:"Dispersão",  isCorrect:true  }, { letter:"D", text:"Difração",    isCorrect:false },
      { letter:"E", text:"Interferência",isCorrect:false}]},
  { statement: "A unidade de frequência no SI é:", topicIdx: 4,
    explanation: "A frequência é medida em Hertz (Hz) = 1 ciclo por segundo",
    options: [
      { letter:"A", text:"Metro",   isCorrect:false }, { letter:"B", text:"Joule",   isCorrect:false },
      { letter:"C", text:"Newton",  isCorrect:false }, { letter:"D", text:"Hertz",   isCorrect:true  },
      { letter:"E", text:"Pascal",  isCorrect:false }]},
  { statement: "O princípio de Arquimedes afirma que:", topicIdx: 0,
    explanation: "Todo corpo mergulhado em fluido sofre empuxo igual ao peso do fluido deslocado",
    options: [
      { letter:"A", text:"F = ma",                               isCorrect:false },
      { letter:"B", text:"Todo corpo submerso sofre empuxo",     isCorrect:true  },
      { letter:"C", text:"Energia não se cria nem se destrói",   isCorrect:false },
      { letter:"D", text:"Ação e reação são iguais",             isCorrect:false },
      { letter:"E", text:"Pressão é inversamente prop. ao volume",isCorrect:false}]},
  { statement: "A quantidade de movimento (impulso) é dada por:", topicIdx: 6,
    explanation: "p = m.v — produto da massa pela velocidade",
    options: [
      { letter:"A", text:"m/v",  isCorrect:false }, { letter:"B", text:"m+v",  isCorrect:false },
      { letter:"C", text:"m.v",  isCorrect:true  }, { letter:"D", text:"m.a",  isCorrect:false },
      { letter:"E", text:"F.t",  isCorrect:false }]},
];

const QUESTIONS_QUIMICA: QData[] = [
  { statement: "Qual o número de prótons do oxigênio (O, Z=8)?", topicIdx: 3,
    explanation: "O número atômico Z indica a quantidade de prótons: Z=8 → 8 prótons",
    options: [
      { letter:"A", text:"6",  isCorrect:false }, { letter:"B", text:"7",  isCorrect:false },
      { letter:"C", text:"8",  isCorrect:true  }, { letter:"D", text:"9",  isCorrect:false },
      { letter:"E", text:"10", isCorrect:false }]},
  { statement: "Uma ligação covalente é formada por:", topicIdx: 1,
    explanation: "Ligações covalentes são formadas por compartilhamento de elétrons",
    options: [
      { letter:"A", text:"Transferência de elétrons",   isCorrect:false },
      { letter:"B", text:"Compartilhamento de elétrons",isCorrect:true  },
      { letter:"C", text:"Atração de prótons",          isCorrect:false },
      { letter:"D", text:"Fusão nuclear",               isCorrect:false },
      { letter:"E", text:"Ligação de hidrogênio",       isCorrect:false }]},
  { statement: "Na reação H₂ + ½O₂ → H₂O, que tipo de reação ocorre?", topicIdx: 4,
    explanation: "É uma reação de síntese (combinação), pois dois reagentes geram um produto",
    options: [
      { letter:"A", text:"Decomposição", isCorrect:false }, { letter:"B", text:"Deslocamento", isCorrect:false },
      { letter:"C", text:"Síntese",      isCorrect:true  }, { letter:"D", text:"Análise",      isCorrect:false },
      { letter:"E", text:"Neutralização",isCorrect:false }]},
  { statement: "A fórmula molecular do gás carbônico é:", topicIdx: 4,
    explanation: "CO₂ — 1 carbono e 2 oxigênios",
    options: [
      { letter:"A", text:"CO",  isCorrect:false }, { letter:"B", text:"CO₂", isCorrect:true  },
      { letter:"C", text:"CO₃", isCorrect:false }, { letter:"D", text:"C₂O", isCorrect:false },
      { letter:"E", text:"C₂O₃",isCorrect:false }]},
  { statement: "Em 1 mol de qualquer substância há quantas moléculas?", topicIdx: 4,
    explanation: "6,022×10²³ moléculas — número de Avogadro",
    options: [
      { letter:"A", text:"6,022×10²¹", isCorrect:false }, { letter:"B", text:"6,022×10²²", isCorrect:false },
      { letter:"C", text:"6,022×10²³", isCorrect:true  }, { letter:"D", text:"6,022×10²⁴", isCorrect:false },
      { letter:"E", text:"6,022×10²⁵", isCorrect:false }]},
  { statement: "O pH de uma solução neutra a 25°C é:", topicIdx: 5,
    explanation: "pH = 7 indica solução neutra; < 7 ácida; > 7 básica",
    options: [
      { letter:"A", text:"0",  isCorrect:false }, { letter:"B", text:"5",  isCorrect:false },
      { letter:"C", text:"7",  isCorrect:true  }, { letter:"D", text:"10", isCorrect:false },
      { letter:"E", text:"14", isCorrect:false }]},
  { statement: "Qual o grupo funcional dos álcoois?", topicIdx: 0,
    explanation: "Álcoois possuem grupo hidroxila (-OH) ligado a carbono saturado",
    options: [
      { letter:"A", text:"-CHO", isCorrect:false }, { letter:"B", text:"-COOH", isCorrect:false },
      { letter:"C", text:"-OH",  isCorrect:true  }, { letter:"D", text:"-NH₂",  isCorrect:false },
      { letter:"E", text:"-CO-", isCorrect:false }]},
  { statement: "Qual é a massa molar da água (H₂O)?", topicIdx: 1,
    explanation: "H=1×2 + O=16 → 18 g/mol",
    options: [
      { letter:"A", text:"16 g/mol", isCorrect:false }, { letter:"B", text:"17 g/mol", isCorrect:false },
      { letter:"C", text:"18 g/mol", isCorrect:true  }, { letter:"D", text:"20 g/mol", isCorrect:false },
      { letter:"E", text:"32 g/mol", isCorrect:false }]},
  { statement: "Cracking é um processo da indústria que:", topicIdx: 0,
    explanation: "Cracking quebra moléculas grandes de petróleo em menores (ex: gasolina)",
    options: [
      { letter:"A", text:"Une moléculas pequenas em grandes",   isCorrect:false },
      { letter:"B", text:"Quebra moléculas grandes em menores",isCorrect:true  },
      { letter:"C", text:"Purifica a água potável",            isCorrect:false },
      { letter:"D", text:"Produz nitrogênio líquido",          isCorrect:false },
      { letter:"E", text:"Oxida compostos orgânicos",          isCorrect:false }]},
  { statement: "Em uma solução com 2 mol de soluto em 500 mL, a molaridade é:", topicIdx: 5,
    explanation: "M = n/V = 2/0,5 = 4 mol/L",
    options: [
      { letter:"A", text:"1 mol/L", isCorrect:false }, { letter:"B", text:"2 mol/L", isCorrect:false },
      { letter:"C", text:"3 mol/L", isCorrect:false }, { letter:"D", text:"4 mol/L", isCorrect:true  },
      { letter:"E", text:"5 mol/L", isCorrect:false }]},
];

const QUESTIONS_HISTORIA: QData[] = [
  { statement: "Em que ano o Brasil proclamou sua independência?", topicIdx: 1,
    explanation: "A Independência do Brasil foi declarada por D. Pedro I em 7 de setembro de 1822",
    options: [
      { letter:"A", text:"1808", isCorrect:false }, { letter:"B", text:"1815", isCorrect:false },
      { letter:"C", text:"1822", isCorrect:true  }, { letter:"D", text:"1840", isCorrect:false },
      { letter:"E", text:"1889", isCorrect:false }]},
  { statement: "A abolição da escravidão no Brasil ocorreu com a Lei:", topicIdx: 1,
    explanation: "A Lei Áurea, assinada pela Princesa Isabel em 13/05/1888, aboliu a escravidão",
    options: [
      { letter:"A", text:"Lei do Ventre Livre", isCorrect:false }, { letter:"B", text:"Lei Saraiva",       isCorrect:false },
      { letter:"C", text:"Lei Áurea",           isCorrect:true  }, { letter:"D", text:"Lei do Sexagenário",isCorrect:false },
      { letter:"E", text:"Lei Eusébio de Queirós",isCorrect:false}]},
  { statement: "A Segunda Guerra Mundial terminou em:", topicIdx: 4,
    explanation: "A 2ª Guerra terminou em 1945 com a rendição da Alemanha (maio) e do Japão (setembro)",
    options: [
      { letter:"A", text:"1943", isCorrect:false }, { letter:"B", text:"1944", isCorrect:false },
      { letter:"C", text:"1945", isCorrect:true  }, { letter:"D", text:"1946", isCorrect:false },
      { letter:"E", text:"1947", isCorrect:false }]},
  { statement: "O período colonial brasileiro durou de 1500 até:", topicIdx: 0,
    explanation: "O período colonial vai de 1500 (chegada de Cabral) a 1822 (Independência)",
    options: [
      { letter:"A", text:"1808", isCorrect:false }, { letter:"B", text:"1815", isCorrect:false },
      { letter:"C", text:"1822", isCorrect:true  }, { letter:"D", text:"1840", isCorrect:false },
      { letter:"E", text:"1889", isCorrect:false }]},
  { statement: "A Revolução Industrial começou em qual país?", topicIdx: 5,
    explanation: "A Revolução Industrial iniciou na Inglaterra no século XVIII",
    options: [
      { letter:"A", text:"França",    isCorrect:false }, { letter:"B", text:"Alemanha",  isCorrect:false },
      { letter:"C", text:"Inglaterra",isCorrect:true  }, { letter:"D", text:"EUA",        isCorrect:false },
      { letter:"E", text:"Bélgica",   isCorrect:false }]},
  { statement: "Qual foi o principal sistema econômico do Brasil Colônia?", topicIdx: 0,
    explanation: "O Pacto Colonial (mercantilismo) foi o sistema econômico predominante",
    options: [
      { letter:"A", text:"Capitalismo",   isCorrect:false }, { letter:"B", text:"Socialismo",   isCorrect:false },
      { letter:"C", text:"Mercantilismo", isCorrect:true  }, { letter:"D", text:"Feudalismo",    isCorrect:false },
      { letter:"E", text:"Escambo",       isCorrect:false }]},
  { statement: "A Proclamação da República no Brasil aconteceu em:", topicIdx: 2,
    explanation: "15 de novembro de 1889 — Marechal Deodoro da Fonseca proclamou a República",
    options: [
      { letter:"A", text:"1888", isCorrect:false }, { letter:"B", text:"1889", isCorrect:true  },
      { letter:"C", text:"1891", isCorrect:false }, { letter:"D", text:"1894", isCorrect:false },
      { letter:"E", text:"1900", isCorrect:false }]},
  { statement: "Getúlio Vargas governou o Brasil no período do:", topicIdx: 2,
    explanation: "O Estado Novo foi o período ditatorial de Vargas (1937-1945)",
    options: [
      { letter:"A", text:"Segundo Reinado", isCorrect:false }, { letter:"B", text:"República Velha", isCorrect:false },
      { letter:"C", text:"Estado Novo",     isCorrect:true  }, { letter:"D", text:"Regime Militar",  isCorrect:false },
      { letter:"E", text:"República Nova",  isCorrect:false }]},
  { statement: "O nazismo na Alemanha foi liderado por:", topicIdx: 4,
    explanation: "Adolf Hitler liderou o partido nazista e governou a Alemanha (1933-1945)",
    options: [
      { letter:"A", text:"Mussolini",  isCorrect:false }, { letter:"B", text:"Stalin",     isCorrect:false },
      { letter:"C", text:"Hitler",     isCorrect:true  }, { letter:"D", text:"Churchill",  isCorrect:false },
      { letter:"E", text:"Roosevelt",  isCorrect:false }]},
  { statement: "O tratado que encerrou a 1ª Guerra Mundial foi:", topicIdx: 4,
    explanation: "O Tratado de Versalhes (1919) responsabilizou a Alemanha pela guerra",
    options: [
      { letter:"A", text:"Tratado de Paris",    isCorrect:false }, { letter:"B", text:"Tratado de Viena",   isCorrect:false },
      { letter:"C", text:"Tratado de Versalhes",isCorrect:true  }, { letter:"D", text:"Tratado de Utrecht", isCorrect:false },
      { letter:"E", text:"Tratado de Tordesilhas",isCorrect:false}]},
];

const ALL_QUESTIONS_POOL: Record<string, QData[]> = {
  Matemática:        QUESTIONS_MATEMATICA,
  Física:            QUESTIONS_FISICA,
  Química:           QUESTIONS_QUIMICA,
  História:          QUESTIONS_HISTORIA,
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Iniciando seed de dados...\n");

  // Verifica se tenant 1 existe
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, TENANT_ID));
  if (!tenant) { console.error("❌ Tenant 1 não encontrado. Execute o registro primeiro."); process.exit(1); }
  console.log(`✅ Tenant: ${tenant.name}`);

  // 1. PROFESSORES ─────────────────────────────────────────────────────────────
  console.log("\n👩‍🏫 Criando professores...");
  const teacherIds: number[] = [];
  for (const t of TEACHERS) {
    const existing = await db.select({ id: usersTable.id }).from(usersTable)
      .where(sql`email = ${t.email} AND tenant_id = ${TENANT_ID}`);
    if (existing.length) { teacherIds.push(existing[0].id); continue; }
    const [u] = await db.insert(usersTable).values({
      tenantId: TENANT_ID, name: t.name, email: t.email,
      passwordHash: hashPassword("senha123"), role: "teacher",
    }).returning({ id: usersTable.id });
    teacherIds.push(u.id);
    console.log(`  + ${t.name}`);
  }

  // 2. DISCIPLINAS E TÓPICOS ────────────────────────────────────────────────────
  console.log("\n📚 Criando disciplinas e tópicos...");
  const subjectMap: Record<string, { id: number; topicIds: number[] }> = {};
  for (const sd of SUBJECTS_DATA) {
    let [existingSub] = await db.select().from(subjectsTable)
      .where(sql`name = ${sd.name} AND tenant_id = ${TENANT_ID}`);
    if (!existingSub) {
      [existingSub] = await db.insert(subjectsTable).values({ tenantId: TENANT_ID, name: sd.name, color: sd.color }).returning();
      console.log(`  + Disciplina: ${sd.name}`);
    }
    const topicIds: number[] = [];
    for (const topicName of sd.topics) {
      let [existingTopic] = await db.select().from(topicsTable)
        .where(sql`name = ${topicName} AND subject_id = ${existingSub.id}`);
      if (!existingTopic) {
        [existingTopic] = await db.insert(topicsTable).values({ subjectId: existingSub.id, name: topicName }).returning();
      }
      topicIds.push(existingTopic.id);
    }
    subjectMap[sd.name] = { id: existingSub.id, topicIds };
  }

  // 3. SÉRIES ──────────────────────────────────────────────────────────────────
  console.log("\n🎓 Criando séries...");
  const seriesData = [
    { name: "1° ano EM", educationalLevel: "medio" as const, order: 1 },
    { name: "2° ano EM", educationalLevel: "medio" as const, order: 2 },
    { name: "3° ano EM", educationalLevel: "medio" as const, order: 3 },
    { name: "9° ano EF", educationalLevel: "fundamental" as const, order: 9 },
  ];
  const serieIds: number[] = [];
  for (const sd of seriesData) {
    let [existing] = await db.select().from(seriesTable)
      .where(sql`name = ${sd.name} AND tenant_id = ${TENANT_ID}`);
    if (!existing) {
      [existing] = await db.insert(seriesTable).values({ tenantId: TENANT_ID, ...sd }).returning();
      console.log(`  + Série: ${sd.name}`);
    }
    serieIds.push(existing.id);
  }

  // 4. TURMAS ──────────────────────────────────────────────────────────────────
  console.log("\n🏫 Criando turmas...");
  const classesData = [
    { name: "3° A — Manhã", serieIdx: 2, shift: "manha" as const },
    { name: "3° B — Tarde",  serieIdx: 2, shift: "tarde" as const },
    { name: "2° A — Manhã", serieIdx: 1, shift: "manha" as const },
    { name: "9° EF — Manhã", serieIdx: 3, shift: "manha" as const },
  ];
  const classIds: number[] = [];
  for (const cd of classesData) {
    let [existing] = await db.select().from(classesTable)
      .where(sql`name = ${cd.name} AND tenant_id = ${TENANT_ID}`);
    if (!existing) {
      [existing] = await db.insert(classesTable).values({
        tenantId: TENANT_ID, serieId: serieIds[cd.serieIdx],
        name: cd.name, shift: cd.shift, year: 2026,
      }).returning();
      console.log(`  + Turma: ${cd.name}`);
    }
    classIds.push(existing.id);
  }

  // 5. ALUNOS + MATRÍCULA ──────────────────────────────────────────────────────
  console.log("\n👨‍🎓 Criando alunos e matriculando...");
  const studentGroups = [STUDENTS_3A, STUDENTS_3B, STUDENTS_2A];

  async function ensureStudent(name: string, classId: number): Promise<number> {
    const email = name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g,".") + "@aluno.escolateste.com";
    let [existing] = await db.select().from(usersTable).where(sql`email = ${email} AND tenant_id = ${TENANT_ID}`);
    if (!existing) {
      [existing] = await db.insert(usersTable).values({
        tenantId: TENANT_ID, name, email,
        passwordHash: hashPassword("senha123"), role: "student",
        registrationNumber: `${2026}${String(Math.floor(Math.random()*9000)+1000)}`,
      }).returning();
    }
    const alreadyEnrolled = await db.select().from(classStudentsTable)
      .where(sql`class_id = ${classId} AND student_id = ${existing.id}`);
    if (!alreadyEnrolled.length) {
      await db.insert(classStudentsTable).values({ classId, studentId: existing.id });
    }
    return existing.id;
  }

  const studentIdsByClass: number[][] = [];
  for (let i = 0; i < 3; i++) {
    const ids: number[] = [];
    for (const name of studentGroups[i]) {
      const id = await ensureStudent(name, classIds[i]);
      ids.push(id);
    }
    studentIdsByClass.push(ids);
    console.log(`  + ${studentGroups[i].length} alunos em ${classesData[i].name}`);
  }

  // 6. PROVAS ──────────────────────────────────────────────────────────────────
  console.log("\n📝 Criando provas...");
  const examsToCreate = [
    {
      title: "Simulado ENEM — Ciências da Natureza",
      type: "enem" as const, subjectName: "Física",
      classIdx: 0, timeLimitMinutes: 90,
      startsAt: daysAgo(45), endsAt: daysAgo(44),
    },
    {
      title: "Prova Bimestral — Matemática 3° ano",
      type: "traditional" as const, subjectName: "Matemática",
      classIdx: 0, timeLimitMinutes: 60,
      startsAt: daysAgo(30), endsAt: daysAgo(29),
    },
    {
      title: "Avaliação — Química Orgânica",
      type: "traditional" as const, subjectName: "Química",
      classIdx: 1, timeLimitMinutes: 50,
      startsAt: daysAgo(20), endsAt: daysAgo(19),
    },
    {
      title: "Simulado Mensal — História",
      type: "simulado" as const, subjectName: "História",
      classIdx: 1, timeLimitMinutes: 45,
      startsAt: daysAgo(14), endsAt: daysAgo(13),
    },
    {
      title: "Prova Bimestral — Matemática 2° ano",
      type: "traditional" as const, subjectName: "Matemática",
      classIdx: 2, timeLimitMinutes: 60,
      startsAt: daysAgo(25), endsAt: daysAgo(24),
    },
    {
      title: "Atividade — Física Clássica",
      type: "homework" as const, subjectName: "Física",
      classIdx: 2, timeLimitMinutes: 40,
      startsAt: daysAgo(10), endsAt: daysAgo(9),
    },
    {
      title: "Simulado ENEM — Ciências Humanas",
      type: "enem" as const, subjectName: "História",
      classIdx: 0, timeLimitMinutes: 90,
      startsAt: daysAgo(7), endsAt: daysAgo(6),
    },
    {
      title: "Avaliação Diagnóstica — Química",
      type: "traditional" as const, subjectName: "Química",
      classIdx: 0, timeLimitMinutes: 50,
      startsAt: daysAgo(5), endsAt: daysAgo(4),
    },
  ];

  const createdExams: Array<{ id: number; subjectName: string; classIdx: number }> = [];

  for (const ed of examsToCreate) {
    const existingExam = await db.select().from(examsTable)
      .where(sql`title = ${ed.title} AND tenant_id = ${TENANT_ID}`);
    if (existingExam.length) {
      createdExams.push({ id: existingExam[0].id, subjectName: ed.subjectName, classIdx: ed.classIdx });
      continue;
    }
    const [exam] = await db.insert(examsTable).values({
      tenantId: TENANT_ID,
      title: ed.title, type: ed.type,
      status: "closed",
      timeLimitMinutes: ed.timeLimitMinutes,
      classId: classIds[ed.classIdx],
      subjectId: subjectMap[ed.subjectName]?.id ?? null,
      isPublic: false, showResultImmediately: true,
      createdById: ADMIN_ID,
      startsAt: ed.startsAt, endsAt: ed.endsAt,
    }).returning();
    createdExams.push({ id: exam.id, subjectName: ed.subjectName, classIdx: ed.classIdx });
    console.log(`  + Prova: ${ed.title}`);

    // Adiciona questões
    const pool2 = ALL_QUESTIONS_POOL[ed.subjectName] ?? QUESTIONS_MATEMATICA;
    const topicIds = subjectMap[ed.subjectName]?.topicIds ?? [];
    for (let qi = 0; qi < pool2.length; qi++) {
      const qd = pool2[qi];
      const topicId = topicIds[qd.topicIdx] ?? null;
      const [q] = await db.insert(questionsTable).values({
        examId: exam.id, type: "multiple_choice",
        statement: qd.statement, explanation: qd.explanation,
        topicId, points: "1", order: qi,
      }).returning();
      await db.insert(questionOptionsTable).values(
        qd.options.map(o => ({ questionId: q.id, text: o.text, letter: o.letter, isCorrect: o.isCorrect }))
      );
    }
  }

  // 7. SESSÕES DOS ALUNOS ───────────────────────────────────────────────────────
  console.log("\n🎯 Simulando sessões de alunos...");

  for (const examInfo of createdExams) {
    const students = studentIdsByClass[examInfo.classIdx] ?? studentIdsByClass[0];
    const questions = await db.select().from(questionsTable)
      .where(eq(questionsTable.examId, examInfo.id));
    if (!questions.length) continue;

    const qIds = questions.map(q => q.id);
    const options = await db.select().from(questionOptionsTable)
      .where(inArray(questionOptionsTable.questionId, qIds));
    const correctOptByQ: Record<number, number> = {};
    const allOptsByQ: Record<number, number[]> = {};
    for (const o of options) {
      if (o.isCorrect) correctOptByQ[o.questionId] = o.id;
      if (!allOptsByQ[o.questionId]) allOptsByQ[o.questionId] = [];
      allOptsByQ[o.questionId].push(o.id);
    }

    const maxScore = questions.length;

    // Distribuição realista de notas: a maioria entre 40-80%
    const scoreProfiles = [
      0.9, 0.85, 0.80, 0.80, 0.75, 0.75, 0.70, 0.70, 0.70, 0.65,
      0.65, 0.65, 0.60, 0.60, 0.60, 0.55, 0.55, 0.50, 0.50, 0.45,
    ];

    for (let si = 0; si < students.length; si++) {
      const studentId = students[si];
      const targetPct = scoreProfiles[si % scoreProfiles.length] + (Math.random() * 0.1 - 0.05);

      const existingSession = await db.select().from(examSessionsTable)
        .where(sql`exam_id = ${examInfo.id} AND student_id = ${studentId}`);
      if (existingSession.length) continue;

      const startedAt = new Date((examsToCreate.find(e =>
        createdExams.find(ce => ce.id === examInfo.id)?.subjectName === e.subjectName
      )?.startsAt ?? daysAgo(10)).getTime() + rand(0, 120) * 60000);
      const submittedAt = new Date(startedAt.getTime() + rand(20, 55) * 60000);

      const [session] = await db.insert(examSessionsTable).values({
        examId: examInfo.id, studentId,
        status: "submitted",
        startedAt, submittedAt,
        score: "0", maxScore: String(maxScore),
      }).returning();

      let correct = 0;
      for (const q of questions) {
        const isCorrect = Math.random() < targetPct;
        const selectedOptionId = isCorrect
          ? correctOptByQ[q.id]
          : pick(allOptsByQ[q.id].filter(id => id !== correctOptByQ[q.id]));
        if (selectedOptionId) {
          await db.insert(studentAnswersTable).values({
            sessionId: session.id, questionId: q.id,
            selectedOptionId, isCorrect,
          });
          if (isCorrect) correct++;
        }
      }

      await db.update(examSessionsTable)
        .set({ score: String(correct), maxScore: String(maxScore) })
        .where(eq(examSessionsTable.id, session.id));
    }
    console.log(`  ✓ ${students.length} sessões → ${examInfo.id}: ${createdExams.find(e=>e.id===examInfo.id) ? examsToCreate.find((_,i)=>createdExams[i]?.id===examInfo.id)?.title ?? "prova" : "prova"}`);
  }

  // 8. ACTIVITY LOG ─────────────────────────────────────────────────────────────
  console.log("\n📊 Registrando atividades...");
  const activityTypes = [
    { type: "exam_submitted",  desc: "Prova submetida com sucesso" },
    { type: "user_registered", desc: "Novo aluno cadastrado na plataforma" },
    { type: "exam_created",    desc: "Nova prova criada pelo professor" },
    { type: "class_updated",   desc: "Turma atualizada pelo coordenador" },
  ];
  for (const act of activityTypes) {
    const allStudents = studentIdsByClass.flat();
    await db.insert(activityLogTable).values({
      tenantId: TENANT_ID,
      userId: pick([...teacherIds, ADMIN_ID, ...allStudents.slice(0,5)]),
      type: act.type,
      description: act.desc,
      createdAt: daysAgo(rand(1, 30)),
    } as any);
  }

  console.log("\n✅ Seed concluído com sucesso!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Professores: ${TEACHERS.length}`);
  console.log(`  Alunos: ${studentGroups.flat().length} em 3 turmas`);
  console.log(`  Disciplinas: ${SUBJECTS_DATA.length}`);
  console.log(`  Provas: ${examsToCreate.length} (com 10 questões cada)`);
  console.log(`  Sessões simuladas: ~${examsToCreate.length * 20}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await pool.end();
}

main().catch(e => { console.error("❌ Erro:", e); process.exit(1); });
