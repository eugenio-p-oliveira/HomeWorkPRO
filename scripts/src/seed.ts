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
function daysFromNow(n: number) {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  return d;
}

// ─── DADOS ────────────────────────────────────────────────────────────────────

const TEACHERS = [
  { name: "Prof. Carlos Mendes",   email: "carlos.mendes@escolateste.com" },
  { name: "Profa. Ana Rodrigues",  email: "ana.rodrigues@escolateste.com" },
  { name: "Prof. Roberto Lima",    email: "roberto.lima@escolateste.com" },
  { name: "Profa. Fernanda Costa", email: "fernanda.costa@escolateste.com" },
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
const STUDENTS_9EF = [
  "Alice Duarte","Bruno Faria","Camila Esteves","Davi Lemos","Eduarda Pinheiro",
  "Felipe Ramos","Giovana Serra","Hugo Vieira","Isadora Macedo","João Pedro Costa",
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
  { statement: "Se f(x) = 2x² − 3x + 1, qual o valor de f(2)?", topicIdx: 4, explanation: "f(2) = 2(4) − 3(2) + 1 = 8 − 6 + 1 = 3",
    options: [{ letter:"A",text:"1",isCorrect:false},{letter:"B",text:"2",isCorrect:false},{letter:"C",text:"3",isCorrect:true},{letter:"D",text:"4",isCorrect:false},{letter:"E",text:"5",isCorrect:false}]},
  { statement: "A soma dos ângulos internos de um pentágono é:", topicIdx: 1, explanation: "(5−2)×180 = 540°",
    options: [{ letter:"A",text:"360°",isCorrect:false},{letter:"B",text:"450°",isCorrect:false},{letter:"C",text:"540°",isCorrect:true},{letter:"D",text:"630°",isCorrect:false},{letter:"E",text:"720°",isCorrect:false}]},
  { statement: "A PA (2, 5, 8, ...) tem razão:", topicIdx: 5, explanation: "r = 5 − 2 = 3",
    options: [{ letter:"A",text:"1",isCorrect:false},{letter:"B",text:"2",isCorrect:false},{letter:"C",text:"3",isCorrect:true},{letter:"D",text:"4",isCorrect:false},{letter:"E",text:"5",isCorrect:false}]},
  { statement: "O determinante da matriz [[3,1],[2,4]] é:", topicIdx: 6, explanation: "det = 3×4 − 1×2 = 10",
    options: [{ letter:"A",text:"8",isCorrect:false},{letter:"B",text:"10",isCorrect:true},{letter:"C",text:"12",isCorrect:false},{letter:"D",text:"14",isCorrect:false},{letter:"E",text:"16",isCorrect:false}]},
  { statement: "Quantos são os divisores de 36?", topicIdx: 0, explanation: "36 = 2²×3². Divisores: (2+1)(2+1) = 9",
    options: [{ letter:"A",text:"6",isCorrect:false},{letter:"B",text:"7",isCorrect:false},{letter:"C",text:"8",isCorrect:false},{letter:"D",text:"9",isCorrect:true},{letter:"E",text:"12",isCorrect:false}]},
  { statement: "O valor de sen(30°) é:", topicIdx: 2, explanation: "sen(30°) = 1/2",
    options: [{ letter:"A",text:"√2/2",isCorrect:false},{letter:"B",text:"√3/2",isCorrect:false},{letter:"C",text:"1",isCorrect:false},{letter:"D",text:"1/2",isCorrect:true},{letter:"E",text:"0",isCorrect:false}]},
  { statement: "A média aritmética de {4, 8, 12, 16} é:", topicIdx: 3, explanation: "Média = (4+8+12+16)/4 = 10",
    options: [{ letter:"A",text:"8",isCorrect:false},{letter:"B",text:"9",isCorrect:false},{letter:"C",text:"10",isCorrect:true},{letter:"D",text:"11",isCorrect:false},{letter:"E",text:"12",isCorrect:false}]},
  { statement: "Qual é a equação da reta por (0,2) com inclinação 3?", topicIdx: 4, explanation: "y = 3x + 2",
    options: [{ letter:"A",text:"y=2x+3",isCorrect:false},{letter:"B",text:"y=3x−2",isCorrect:false},{letter:"C",text:"y=3x+2",isCorrect:true},{letter:"D",text:"y=x+3",isCorrect:false},{letter:"E",text:"y=2x−3",isCorrect:false}]},
  { statement: "O 10º termo da PA (1, 4, 7, ...) é:", topicIdx: 5, explanation: "a₁₀ = 1 + 9×3 = 28",
    options: [{ letter:"A",text:"25",isCorrect:false},{letter:"B",text:"27",isCorrect:false},{letter:"C",text:"28",isCorrect:true},{letter:"D",text:"29",isCorrect:false},{letter:"E",text:"30",isCorrect:false}]},
  { statement: "A área de um triângulo de base 8 e altura 5 é:", topicIdx: 1, explanation: "A = (8×5)/2 = 20",
    options: [{ letter:"A",text:"15",isCorrect:false},{letter:"B",text:"18",isCorrect:false},{letter:"C",text:"20",isCorrect:true},{letter:"D",text:"22",isCorrect:false},{letter:"E",text:"40",isCorrect:false}]},
];

const QUESTIONS_FISICA: QData[] = [
  { statement: "Um objeto em MRU percorre 150 m em 30 s. Qual sua velocidade?", topicIdx: 5, explanation: "v = 150/30 = 5 m/s",
    options: [{ letter:"A",text:"3 m/s",isCorrect:false},{letter:"B",text:"4 m/s",isCorrect:false},{letter:"C",text:"5 m/s",isCorrect:true},{letter:"D",text:"6 m/s",isCorrect:false},{letter:"E",text:"10 m/s",isCorrect:false}]},
  { statement: "A Segunda Lei de Newton estabelece que F = ?", topicIdx: 6, explanation: "F = m.a",
    options: [{ letter:"A",text:"m/a",isCorrect:false},{letter:"B",text:"m.v",isCorrect:false},{letter:"C",text:"m.a",isCorrect:true},{letter:"D",text:"m.g",isCorrect:false},{letter:"E",text:"a/m",isCorrect:false}]},
  { statement: "A unidade de medida de energia no SI é:", topicIdx: 1, explanation: "Joule (J)",
    options: [{ letter:"A",text:"Newton",isCorrect:false},{letter:"B",text:"Watt",isCorrect:false},{letter:"C",text:"Pascal",isCorrect:false},{letter:"D",text:"Joule",isCorrect:true},{letter:"E",text:"Coulomb",isCorrect:false}]},
  { statement: "Qual é a velocidade da luz no vácuo?", topicIdx: 2, explanation: "c ≈ 3×10⁸ m/s",
    options: [{ letter:"A",text:"3×10⁶ m/s",isCorrect:false},{letter:"B",text:"3×10⁷ m/s",isCorrect:false},{letter:"C",text:"3×10⁸ m/s",isCorrect:true},{letter:"D",text:"3×10⁹ m/s",isCorrect:false},{letter:"E",text:"3×10⁵ m/s",isCorrect:false}]},
  { statement: "Em V = 12V e R = 4Ω, a corrente é:", topicIdx: 3, explanation: "I = V/R = 3 A",
    options: [{ letter:"A",text:"1 A",isCorrect:false},{letter:"B",text:"2 A",isCorrect:false},{letter:"C",text:"3 A",isCorrect:true},{letter:"D",text:"4 A",isCorrect:false},{letter:"E",text:"6 A",isCorrect:false}]},
  { statement: "A dilatação dos corpos é estudada pela:", topicIdx: 1, explanation: "Termodinâmica",
    options: [{ letter:"A",text:"Óptica",isCorrect:false},{letter:"B",text:"Mecânica",isCorrect:false},{letter:"C",text:"Termodinâmica",isCorrect:true},{letter:"D",text:"Eletrostática",isCorrect:false},{letter:"E",text:"Ondulatória",isCorrect:false}]},
  { statement: "Qual fenômeno explica por que vemos objetos com cores?", topicIdx: 2, explanation: "Dispersão da luz",
    options: [{ letter:"A",text:"Reflexão",isCorrect:false},{letter:"B",text:"Refração",isCorrect:false},{letter:"C",text:"Dispersão",isCorrect:true},{letter:"D",text:"Difração",isCorrect:false},{letter:"E",text:"Interferência",isCorrect:false}]},
  { statement: "A unidade de frequência no SI é:", topicIdx: 4, explanation: "Hertz (Hz)",
    options: [{ letter:"A",text:"Metro",isCorrect:false},{letter:"B",text:"Joule",isCorrect:false},{letter:"C",text:"Newton",isCorrect:false},{letter:"D",text:"Hertz",isCorrect:true},{letter:"E",text:"Pascal",isCorrect:false}]},
  { statement: "O princípio de Arquimedes afirma que:", topicIdx: 0, explanation: "Todo corpo submerso sofre empuxo = peso do fluido deslocado",
    options: [{ letter:"A",text:"F = ma",isCorrect:false},{letter:"B",text:"Todo corpo submerso sofre empuxo",isCorrect:true},{letter:"C",text:"Energia não se cria nem se destrói",isCorrect:false},{letter:"D",text:"Ação e reação são iguais",isCorrect:false},{letter:"E",text:"Pressão é inversamente prop. ao volume",isCorrect:false}]},
  { statement: "A quantidade de movimento é dada por:", topicIdx: 6, explanation: "p = m.v",
    options: [{ letter:"A",text:"m/v",isCorrect:false},{letter:"B",text:"m+v",isCorrect:false},{letter:"C",text:"m.v",isCorrect:true},{letter:"D",text:"m.a",isCorrect:false},{letter:"E",text:"F.t",isCorrect:false}]},
];

const QUESTIONS_QUIMICA: QData[] = [
  { statement: "Qual o número de prótons do oxigênio (Z=8)?", topicIdx: 3, explanation: "Z = número de prótons = 8",
    options: [{ letter:"A",text:"6",isCorrect:false},{letter:"B",text:"7",isCorrect:false},{letter:"C",text:"8",isCorrect:true},{letter:"D",text:"9",isCorrect:false},{letter:"E",text:"10",isCorrect:false}]},
  { statement: "Ligação covalente é formada por:", topicIdx: 2, explanation: "Compartilhamento de elétrons",
    options: [{ letter:"A",text:"Transferência de elétrons",isCorrect:false},{letter:"B",text:"Compartilhamento de elétrons",isCorrect:true},{letter:"C",text:"Atração de prótons",isCorrect:false},{letter:"D",text:"Fusão nuclear",isCorrect:false},{letter:"E",text:"Ligação de hidrogênio",isCorrect:false}]},
  { statement: "Na reação H₂ + ½O₂ → H₂O, que tipo de reação ocorre?", topicIdx: 4, explanation: "Síntese (combinação)",
    options: [{ letter:"A",text:"Decomposição",isCorrect:false},{letter:"B",text:"Deslocamento",isCorrect:false},{letter:"C",text:"Síntese",isCorrect:true},{letter:"D",text:"Análise",isCorrect:false},{letter:"E",text:"Neutralização",isCorrect:false}]},
  { statement: "A fórmula molecular do gás carbônico é:", topicIdx: 4, explanation: "CO₂",
    options: [{ letter:"A",text:"CO",isCorrect:false},{letter:"B",text:"CO₂",isCorrect:true},{letter:"C",text:"CO₃",isCorrect:false},{letter:"D",text:"C₂O",isCorrect:false},{letter:"E",text:"C₂O₃",isCorrect:false}]},
  { statement: "Em 1 mol de qualquer substância há quantas moléculas?", topicIdx: 4, explanation: "6,022×10²³",
    options: [{ letter:"A",text:"6,022×10²¹",isCorrect:false},{letter:"B",text:"6,022×10²²",isCorrect:false},{letter:"C",text:"6,022×10²³",isCorrect:true},{letter:"D",text:"6,022×10²⁴",isCorrect:false},{letter:"E",text:"6,022×10²⁵",isCorrect:false}]},
  { statement: "O pH de uma solução neutra é:", topicIdx: 5, explanation: "pH = 7",
    options: [{ letter:"A",text:"0",isCorrect:false},{letter:"B",text:"5",isCorrect:false},{letter:"C",text:"7",isCorrect:true},{letter:"D",text:"10",isCorrect:false},{letter:"E",text:"14",isCorrect:false}]},
  { statement: "Qual o grupo funcional dos álcoois?", topicIdx: 0, explanation: "Grupo hidroxila (-OH)",
    options: [{ letter:"A",text:"-CHO",isCorrect:false},{letter:"B",text:"-COOH",isCorrect:false},{letter:"C",text:"-OH",isCorrect:true},{letter:"D",text:"-NH₂",isCorrect:false},{letter:"E",text:"-CO-",isCorrect:false}]},
  { statement: "Qual é a massa molar da água (H₂O)?", topicIdx: 1, explanation: "H=1×2 + O=16 = 18 g/mol",
    options: [{ letter:"A",text:"16 g/mol",isCorrect:false},{letter:"B",text:"17 g/mol",isCorrect:false},{letter:"C",text:"18 g/mol",isCorrect:true},{letter:"D",text:"20 g/mol",isCorrect:false},{letter:"E",text:"32 g/mol",isCorrect:false}]},
  { statement: "Cracking é um processo que:", topicIdx: 0, explanation: "Quebra moléculas grandes de petróleo em menores",
    options: [{ letter:"A",text:"Une moléculas pequenas em grandes",isCorrect:false},{letter:"B",text:"Quebra moléculas grandes em menores",isCorrect:true},{letter:"C",text:"Purifica a água potável",isCorrect:false},{letter:"D",text:"Produz nitrogênio líquido",isCorrect:false},{letter:"E",text:"Oxida compostos orgânicos",isCorrect:false}]},
  { statement: "Em 2 mol de soluto em 500 mL, a molaridade é:", topicIdx: 5, explanation: "M = n/V = 4 mol/L",
    options: [{ letter:"A",text:"1 mol/L",isCorrect:false},{letter:"B",text:"2 mol/L",isCorrect:false},{letter:"C",text:"3 mol/L",isCorrect:false},{letter:"D",text:"4 mol/L",isCorrect:true},{letter:"E",text:"5 mol/L",isCorrect:false}]},
];

const QUESTIONS_HISTORIA: QData[] = [
  { statement: "Em que ano o Brasil proclamou sua independência?", topicIdx: 1, explanation: "7 de setembro de 1822",
    options: [{ letter:"A",text:"1808",isCorrect:false},{letter:"B",text:"1815",isCorrect:false},{letter:"C",text:"1822",isCorrect:true},{letter:"D",text:"1840",isCorrect:false},{letter:"E",text:"1889",isCorrect:false}]},
  { statement: "A abolição da escravidão no Brasil ocorreu com a:", topicIdx: 1, explanation: "Lei Áurea, 13/05/1888",
    options: [{ letter:"A",text:"Lei do Ventre Livre",isCorrect:false},{letter:"B",text:"Lei Saraiva",isCorrect:false},{letter:"C",text:"Lei Áurea",isCorrect:true},{letter:"D",text:"Lei do Sexagenário",isCorrect:false},{letter:"E",text:"Lei Eusébio de Queirós",isCorrect:false}]},
  { statement: "A Segunda Guerra Mundial terminou em:", topicIdx: 4, explanation: "1945",
    options: [{ letter:"A",text:"1943",isCorrect:false},{letter:"B",text:"1944",isCorrect:false},{letter:"C",text:"1945",isCorrect:true},{letter:"D",text:"1946",isCorrect:false},{letter:"E",text:"1947",isCorrect:false}]},
  { statement: "O período colonial brasileiro durou de 1500 até:", topicIdx: 0, explanation: "1822 (Independência)",
    options: [{ letter:"A",text:"1808",isCorrect:false},{letter:"B",text:"1815",isCorrect:false},{letter:"C",text:"1822",isCorrect:true},{letter:"D",text:"1840",isCorrect:false},{letter:"E",text:"1889",isCorrect:false}]},
  { statement: "A Revolução Industrial começou em qual país?", topicIdx: 5, explanation: "Inglaterra",
    options: [{ letter:"A",text:"França",isCorrect:false},{letter:"B",text:"Alemanha",isCorrect:false},{letter:"C",text:"Inglaterra",isCorrect:true},{letter:"D",text:"EUA",isCorrect:false},{letter:"E",text:"Bélgica",isCorrect:false}]},
  { statement: "Qual foi o principal sistema econômico do Brasil Colônia?", topicIdx: 0, explanation: "Mercantilismo",
    options: [{ letter:"A",text:"Capitalismo",isCorrect:false},{letter:"B",text:"Socialismo",isCorrect:false},{letter:"C",text:"Mercantilismo",isCorrect:true},{letter:"D",text:"Feudalismo",isCorrect:false},{letter:"E",text:"Escambo",isCorrect:false}]},
  { statement: "A Proclamação da República no Brasil aconteceu em:", topicIdx: 2, explanation: "15/11/1889",
    options: [{ letter:"A",text:"1888",isCorrect:false},{letter:"B",text:"1889",isCorrect:true},{letter:"C",text:"1891",isCorrect:false},{letter:"D",text:"1894",isCorrect:false},{letter:"E",text:"1900",isCorrect:false}]},
  { statement: "Getúlio Vargas governou o Brasil no período do:", topicIdx: 2, explanation: "Estado Novo (1937-1945)",
    options: [{ letter:"A",text:"Segundo Reinado",isCorrect:false},{letter:"B",text:"República Velha",isCorrect:false},{letter:"C",text:"Estado Novo",isCorrect:true},{letter:"D",text:"Regime Militar",isCorrect:false},{letter:"E",text:"República Nova",isCorrect:false}]},
  { statement: "O nazismo na Alemanha foi liderado por:", topicIdx: 4, explanation: "Adolf Hitler",
    options: [{ letter:"A",text:"Mussolini",isCorrect:false},{letter:"B",text:"Stalin",isCorrect:false},{letter:"C",text:"Hitler",isCorrect:true},{letter:"D",text:"Churchill",isCorrect:false},{letter:"E",text:"Roosevelt",isCorrect:false}]},
  { statement: "O tratado que encerrou a 1ª Guerra Mundial foi:", topicIdx: 4, explanation: "Tratado de Versalhes (1919)",
    options: [{ letter:"A",text:"Tratado de Paris",isCorrect:false},{letter:"B",text:"Tratado de Viena",isCorrect:false},{letter:"C",text:"Tratado de Versalhes",isCorrect:true},{letter:"D",text:"Tratado de Utrecht",isCorrect:false},{letter:"E",text:"Tratado de Tordesilhas",isCorrect:false}]},
];

const QUESTIONS_BIOLOGIA: QData[] = [
  { statement: "A unidade básica da vida é:", topicIdx: 0, explanation: "A célula é a unidade fundamental dos seres vivos",
    options: [{ letter:"A",text:"Átomo",isCorrect:false},{letter:"B",text:"Molécula",isCorrect:false},{letter:"C",text:"Célula",isCorrect:true},{letter:"D",text:"Tecido",isCorrect:false},{letter:"E",text:"Órgão",isCorrect:false}]},
  { statement: "O DNA é composto por bases nitrogenadas. Qual não é uma delas?", topicIdx: 1, explanation: "Uracila é base do RNA, não do DNA",
    options: [{ letter:"A",text:"Adenina",isCorrect:false},{letter:"B",text:"Timina",isCorrect:false},{letter:"C",text:"Citosina",isCorrect:false},{letter:"D",text:"Guanina",isCorrect:false},{letter:"E",text:"Uracila",isCorrect:true}]},
  { statement: "Fotossíntese ocorre nas:", topicIdx: 5, explanation: "Cloroplastos contêm clorofila para fotossíntese",
    options: [{ letter:"A",text:"Mitocôndrias",isCorrect:false},{letter:"B",text:"Ribossomos",isCorrect:false},{letter:"C",text:"Cloroplastos",isCorrect:true},{letter:"D",text:"Núcleo",isCorrect:false},{letter:"E",text:"Vacúolos",isCorrect:false}]},
  { statement: "Qual processo libera CO₂ nas células?", topicIdx: 4, explanation: "Respiração celular libera CO₂ e produz energia (ATP)",
    options: [{ letter:"A",text:"Fotossíntese",isCorrect:false},{letter:"B",text:"Respiração celular",isCorrect:true},{letter:"C",text:"Mitose",isCorrect:false},{letter:"D",text:"Meiose",isCorrect:false},{letter:"E",text:"Digestão",isCorrect:false}]},
  { statement: "Ecossistema é definido como:", topicIdx: 2, explanation: "Conjunto de seres vivos + ambiente físico interagindo",
    options: [{ letter:"A",text:"Apenas a flora de uma região",isCorrect:false},{letter:"B",text:"Apenas animais de uma região",isCorrect:false},{letter:"C",text:"Seres vivos + ambiente físico em interação",isCorrect:true},{letter:"D",text:"Comunidade de plantas",isCorrect:false},{letter:"E",text:"Animais migratórios",isCorrect:false}]},
  { statement: "A teoria da evolução por seleção natural foi proposta por:", topicIdx: 3, explanation: "Charles Darwin, na obra A Origem das Espécies (1859)",
    options: [{ letter:"A",text:"Mendel",isCorrect:false},{letter:"B",text:"Pasteur",isCorrect:false},{letter:"C",text:"Lamarck",isCorrect:false},{letter:"D",text:"Darwin",isCorrect:true},{letter:"E",text:"Watson",isCorrect:false}]},
  { statement: "Qual tecido é responsável pelo transporte de água em plantas?", topicIdx: 5, explanation: "Xilema transporta água e sais minerais das raízes às folhas",
    options: [{ letter:"A",text:"Floema",isCorrect:false},{letter:"B",text:"Xilema",isCorrect:true},{letter:"C",text:"Epiderme",isCorrect:false},{letter:"D",text:"Câmbio",isCorrect:false},{letter:"E",text:"Parênquima",isCorrect:false}]},
  { statement: "O tipo sanguíneo é determinado por:", topicIdx: 1, explanation: "Herança codominante com 3 alelos: IA, IB, i",
    options: [{ letter:"A",text:"Herança dominante simples",isCorrect:false},{letter:"B",text:"Herança recessiva",isCorrect:false},{letter:"C",text:"Alelos múltiplos codominantes",isCorrect:true},{letter:"D",text:"Herança ligada ao sexo",isCorrect:false},{letter:"E",text:"Mutação genética",isCorrect:false}]},
  { statement: "O grupo dos artrópodes inclui:", topicIdx: 6, explanation: "Insetos, aracnídeos e crustáceos são artrópodes",
    options: [{ letter:"A",text:"Minhocas e polvos",isCorrect:false},{letter:"B",text:"Peixes e anfíbios",isCorrect:false},{letter:"C",text:"Insetos, aracnídeos e crustáceos",isCorrect:true},{letter:"D",text:"Aves e répteis",isCorrect:false},{letter:"E",text:"Mamíferos e aves",isCorrect:false}]},
  { statement: "A camada de ozônio protege a Terra dos raios:", topicIdx: 2, explanation: "Raios UV (ultravioleta) são filtrados pela camada de ozônio",
    options: [{ letter:"A",text:"Infravermelhos",isCorrect:false},{letter:"B",text:"Gama",isCorrect:false},{letter:"C",text:"X",isCorrect:false},{letter:"D",text:"Ultravioleta",isCorrect:true},{letter:"E",text:"Visíveis",isCorrect:false}]},
];

const QUESTIONS_PORTUGUES: QData[] = [
  { statement: "Qual é o sujeito da frase: 'Os alunos estudaram muito'?", topicIdx: 0, explanation: "'Os alunos' é o sujeito determinado simples",
    options: [{ letter:"A",text:"estudaram",isCorrect:false},{letter:"B",text:"Os alunos",isCorrect:true},{letter:"C",text:"muito",isCorrect:false},{letter:"D",text:"alunos estudaram",isCorrect:false},{letter:"E",text:"Oração sem sujeito",isCorrect:false}]},
  { statement: "Assinale a alternativa com erro ortográfico:", topicIdx: 5, explanation: "'Excessão' é errado; correto é 'exceção'",
    options: [{ letter:"A",text:"exceção",isCorrect:false},{letter:"B",text:"conexão",isCorrect:false},{letter:"C",text:"excessão",isCorrect:true},{letter:"D",text:"objeção",isCorrect:false},{letter:"E",text:"inserção",isCorrect:false}]},
  { statement: "Metáfora é uma figura de linguagem que:", topicIdx: 4, explanation: "Metáfora faz comparação implícita (sem 'como', 'tal como')",
    options: [{ letter:"A",text:"Exagera um fato",isCorrect:false},{letter:"B",text:"Faz comparação explícita",isCorrect:false},{letter:"C",text:"Faz comparação implícita",isCorrect:true},{letter:"D",text:"Repete sons",isCorrect:false},{letter:"E",text:"Humaniza seres inanimados",isCorrect:false}]},
  { statement: "Em 'Machado de Assis escreveu Dom Casmurro', o verbo está em qual tempo?", topicIdx: 3, explanation: "Pretérito perfeito do indicativo (ação concluída no passado)",
    options: [{ letter:"A",text:"Presente",isCorrect:false},{letter:"B",text:"Futuro do presente",isCorrect:false},{letter:"C",text:"Pretérito imperfeito",isCorrect:false},{letter:"D",text:"Pretérito perfeito",isCorrect:true},{letter:"E",text:"Pretérito mais-que-perfeito",isCorrect:false}]},
  { statement: "Qual pronome substitui 'Entreguei o livro ao professor'?", topicIdx: 0, explanation: "OI = lhe → 'Entreguei-lhe o livro'",
    options: [{ letter:"A",text:"o",isCorrect:false},{letter:"B",text:"lhe",isCorrect:true},{letter:"C",text:"se",isCorrect:false},{letter:"D",text:"me",isCorrect:false},{letter:"E",text:"nos",isCorrect:false}]},
  { statement: "Encontre o período composto por coordenação:", topicIdx: 0, explanation: "Orações independentes ligadas por conjunção coordenativa",
    options: [{ letter:"A",text:"Quando cheguei, ele saiu",isCorrect:false},{letter:"B",text:"Estudei porque queria passar",isCorrect:false},{letter:"C",text:"Cheguei, sentei e comecei a estudar",isCorrect:true},{letter:"D",text:"É importante que você estude",isCorrect:false},{letter:"E",text:"Penso logo existo",isCorrect:false}]},
  { statement: "Qual é o antônimo de 'nefasto'?", topicIdx: 0, explanation: "Nefasto = funesto, mau. Antônimo: auspicioso, propício",
    options: [{ letter:"A",text:"Trágico",isCorrect:false},{letter:"B",text:"Sombrio",isCorrect:false},{letter:"C",text:"Auspicioso",isCorrect:true},{letter:"D",text:"Lúgubre",isCorrect:false},{letter:"E",text:"Sinistro",isCorrect:false}]},
  { statement: "Conto, crônica e novela são gêneros:", topicIdx: 3, explanation: "São gêneros da prosa de ficção (literatura narrativa)",
    options: [{ letter:"A",text:"Líricos",isCorrect:false},{letter:"B",text:"Dramáticos",isCorrect:false},{letter:"C",text:"Épicos/narrativos",isCorrect:true},{letter:"D",text:"Jornalísticos",isCorrect:false},{letter:"E",text:"Científicos",isCorrect:false}]},
  { statement: "A vírgula é obrigatória em:", topicIdx: 0, explanation: "Vocativo deve ser separado por vírgulas",
    options: [{ letter:"A",text:"Sujeito e predicado simples",isCorrect:false},{letter:"B",text:"Objeto direto e verbo transitivo",isCorrect:false},{letter:"C",text:"Vocativo",isCorrect:true},{letter:"D",text:"Predicativo do sujeito",isCorrect:false},{letter:"E",text:"Sujeito composto antes do verbo",isCorrect:false}]},
  { statement: "Realismo no Brasil tem como obra inaugural:", topicIdx: 3, explanation: "'Memórias Póstumas de Brás Cubas' (1881) de Machado de Assis",
    options: [{ letter:"A",text:"Iracema",isCorrect:false},{letter:"B",text:"Memórias Póstumas de Brás Cubas",isCorrect:true},{letter:"C",text:"O Guarani",isCorrect:false},{letter:"D",text:"A Moreninha",isCorrect:false},{letter:"E",text:"O Cortiço",isCorrect:false}]},
];

const QUESTIONS_GEOGRAFIA: QData[] = [
  { statement: "A maior floresta tropical do mundo é:", topicIdx: 2, explanation: "Floresta Amazônica, na América do Sul",
    options: [{ letter:"A",text:"Floresta do Congo",isCorrect:false},{letter:"B",text:"Floresta Amazônica",isCorrect:true},{letter:"C",text:"Floresta Boreal",isCorrect:false},{letter:"D",text:"Mata Atlântica",isCorrect:false},{letter:"E",text:"Floresta da Sibéria",isCorrect:false}]},
  { statement: "Qual é o país mais populoso do mundo?", topicIdx: 4, explanation: "China com ~1,4 bilhão de habitantes (seguida pela Índia)",
    options: [{ letter:"A",text:"EUA",isCorrect:false},{letter:"B",text:"Brasil",isCorrect:false},{letter:"C",text:"Rússia",isCorrect:false},{letter:"D",text:"China",isCorrect:true},{letter:"E",text:"Índia",isCorrect:false}]},
  { statement: "A projeção cartográfica de Mercator distorce principalmente:", topicIdx: 1, explanation: "Distorce áreas nas regiões polares (exagera tamanho)",
    options: [{ letter:"A",text:"Formas dos continentes",isCorrect:false},{letter:"B",text:"Distâncias no equador",isCorrect:false},{letter:"C",text:"Áreas nas regiões polares",isCorrect:true},{letter:"D",text:"A posição dos oceanos",isCorrect:false},{letter:"E",text:"A direção dos meridianos",isCorrect:false}]},
  { statement: "O fenômeno El Niño consiste em:", topicIdx: 2, explanation: "Aquecimento anormal das águas do Pacífico equatorial",
    options: [{ letter:"A",text:"Resfriamento do Atlântico",isCorrect:false},{letter:"B",text:"Aquecimento anormal do Pacífico equatorial",isCorrect:true},{letter:"C",text:"Furacões no Caribe",isCorrect:false},{letter:"D",text:"Derretimento das calotas polares",isCorrect:false},{letter:"E",text:"Erupções vulcânicas no Pacífico",isCorrect:false}]},
  { statement: "O processo de urbanização acelerada no Brasil ocorreu principalmente:", topicIdx: 3, explanation: "Na segunda metade do século XX, com industrialização",
    options: [{ letter:"A",text:"No início do século XIX",isCorrect:false},{letter:"B",text:"No período colonial",isCorrect:false},{letter:"C",text:"Na segunda metade do século XX",isCorrect:true},{letter:"D",text:"No início do século XX",isCorrect:false},{letter:"E",text:"No século XVIII",isCorrect:false}]},
  { statement: "Qual tipo de rocha é formada pelo resfriamento do magma?", topicIdx: 5, explanation: "Rochas ígneas (magmáticas) formam-se pelo resfriamento do magma",
    options: [{ letter:"A",text:"Sedimentares",isCorrect:false},{letter:"B",text:"Metamórficas",isCorrect:false},{letter:"C",text:"Ígneas",isCorrect:true},{letter:"D",text:"Calcárias",isCorrect:false},{letter:"E",text:"Argilosas",isCorrect:false}]},
  { statement: "O MERCOSUL é um bloco econômico formado principalmente por países:", topicIdx: 0, explanation: "Países da América do Sul: Brasil, Argentina, Uruguai, Paraguai",
    options: [{ letter:"A",text:"Da América do Norte",isCorrect:false},{letter:"B",text:"Da Europa",isCorrect:false},{letter:"C",text:"Da América do Sul",isCorrect:true},{letter:"D",text:"Da Ásia",isCorrect:false},{letter:"E",text:"Da África",isCorrect:false}]},
  { statement: "A Revolução Verde foi um movimento que:", topicIdx: 3, explanation: "Modernizou a agricultura com tecnologias de alta produtividade",
    options: [{ letter:"A",text:"Criou parques ecológicos",isCorrect:false},{letter:"B",text:"Promoveu reflorestamento global",isCorrect:false},{letter:"C",text:"Modernizou a agricultura com tecnologia",isCorrect:true},{letter:"D",text:"Reduziu o uso de agrotóxicos",isCorrect:false},{letter:"E",text:"Criou cooperativas rurais",isCorrect:false}]},
  { statement: "A teoria das placas tectônicas explica:", topicIdx: 5, explanation: "Movimentos das placas da crosta terrestre e terremotos/vulcões",
    options: [{ letter:"A",text:"O ciclo das chuvas",isCorrect:false},{letter:"B",text:"O movimento dos oceanos",isCorrect:false},{letter:"C",text:"Terremotos e formação de montanhas",isCorrect:true},{letter:"D",text:"As correntes de ar",isCorrect:false},{letter:"E",text:"O ciclo das estações",isCorrect:false}]},
  { statement: "Qual é a maior cidade do Brasil em população?", topicIdx: 3, explanation: "São Paulo é a maior cidade do Brasil e da América do Sul",
    options: [{ letter:"A",text:"Rio de Janeiro",isCorrect:false},{letter:"B",text:"Brasília",isCorrect:false},{letter:"C",text:"Belo Horizonte",isCorrect:false},{letter:"D",text:"São Paulo",isCorrect:true},{letter:"E",text:"Salvador",isCorrect:false}]},
];

const ALL_QUESTIONS_POOL: Record<string, QData[]> = {
  "Matemática":        QUESTIONS_MATEMATICA,
  "Física":            QUESTIONS_FISICA,
  "Química":           QUESTIONS_QUIMICA,
  "História":          QUESTIONS_HISTORIA,
  "Biologia":          QUESTIONS_BIOLOGIA,
  "Língua Portuguesa": QUESTIONS_PORTUGUES,
  "Geografia":         QUESTIONS_GEOGRAFIA,
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Iniciando seed de dados...\n");

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, TENANT_ID));
  if (!tenant) { console.error("❌ Tenant 1 não encontrado. Execute o registro primeiro."); process.exit(1); }
  console.log(`✅ Tenant: ${tenant.name}`);

  // ── 1. PROFESSORES ────────────────────────────────────────────────────────
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

  // ── 2. DISCIPLINAS E TÓPICOS ──────────────────────────────────────────────
  console.log("\n📚 Criando disciplinas e tópicos...");
  const subjectMap: Record<string, { id: number; topicIds: number[] }> = {};
  for (const sd of SUBJECTS_DATA) {
    let [existingSub] = await db.select().from(subjectsTable)
      .where(sql`name = ${sd.name} AND tenant_id = ${TENANT_ID}`);
    if (!existingSub) {
      [existingSub] = await db.insert(subjectsTable).values({ tenantId: TENANT_ID, name: sd.name, color: sd.color }).returning();
      console.log(`  + Disciplina: ${sd.name}`);
    } else {
      await db.update(subjectsTable).set({ color: sd.color }).where(eq(subjectsTable.id, existingSub.id));
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

  // ── 3. SÉRIES ─────────────────────────────────────────────────────────────
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

  // ── 4. TURMAS ─────────────────────────────────────────────────────────────
  console.log("\n🏫 Criando turmas...");
  const classesData = [
    { name: "3° A — Manhã",  serieIdx: 2, shift: "manha" as const },
    { name: "3° B — Tarde",  serieIdx: 2, shift: "tarde" as const },
    { name: "2° A — Manhã",  serieIdx: 1, shift: "manha" as const },
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

  // ── 5. ALUNOS + MATRÍCULA ─────────────────────────────────────────────────
  console.log("\n👨‍🎓 Criando alunos e matriculando...");
  const studentGroups = [STUDENTS_3A, STUDENTS_3B, STUDENTS_2A, STUDENTS_9EF];

  async function ensureStudent(name: string, classId: number): Promise<number> {
    const email = name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, ".") + "@aluno.escolateste.com";
    let [existing] = await db.select().from(usersTable).where(sql`email = ${email} AND tenant_id = ${TENANT_ID}`);
    if (!existing) {
      [existing] = await db.insert(usersTable).values({
        tenantId: TENANT_ID, name, email,
        passwordHash: hashPassword("senha123"), role: "student",
        registrationNumber: `2026${String(Math.floor(Math.random() * 9000) + 1000)}`,
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
  for (let i = 0; i < studentGroups.length; i++) {
    const ids: number[] = [];
    for (const name of studentGroups[i]) {
      const id = await ensureStudent(name, classIds[i]);
      ids.push(id);
    }
    studentIdsByClass.push(ids);
    console.log(`  + ${studentGroups[i].length} alunos em ${classesData[i].name}`);
  }

  // ── 6. PROVAS ─────────────────────────────────────────────────────────────
  console.log("\n📝 Criando provas...");

  // Provas passadas (fechadas)
  const closedExams = [
    { title: "Simulado ENEM — Ciências da Natureza",  type: "enem" as const,        subjectName: "Física",            classIdx: 0, timeLimitMinutes: 90, startsAt: daysAgo(75), endsAt: daysAgo(74) },
    { title: "Prova Bimestral — Matemática 3° ano",   type: "traditional" as const, subjectName: "Matemática",        classIdx: 0, timeLimitMinutes: 60, startsAt: daysAgo(60), endsAt: daysAgo(59) },
    { title: "Avaliação — Química Orgânica",           type: "traditional" as const, subjectName: "Química",           classIdx: 1, timeLimitMinutes: 50, startsAt: daysAgo(55), endsAt: daysAgo(54) },
    { title: "Simulado Mensal — História",             type: "simulado" as const,    subjectName: "História",          classIdx: 1, timeLimitMinutes: 45, startsAt: daysAgo(45), endsAt: daysAgo(44) },
    { title: "Prova Bimestral — Matemática 2° ano",   type: "traditional" as const, subjectName: "Matemática",        classIdx: 2, timeLimitMinutes: 60, startsAt: daysAgo(40), endsAt: daysAgo(39) },
    { title: "Atividade — Física Clássica",            type: "homework" as const,    subjectName: "Física",            classIdx: 2, timeLimitMinutes: 40, startsAt: daysAgo(30), endsAt: daysAgo(29) },
    { title: "Simulado ENEM — Ciências Humanas",       type: "enem" as const,        subjectName: "História",          classIdx: 0, timeLimitMinutes: 90, startsAt: daysAgo(20), endsAt: daysAgo(19) },
    { title: "Avaliação Diagnóstica — Química",        type: "traditional" as const, subjectName: "Química",           classIdx: 0, timeLimitMinutes: 50, startsAt: daysAgo(15), endsAt: daysAgo(14) },
    { title: "Prova de Biologia — Citologia",          type: "traditional" as const, subjectName: "Biologia",          classIdx: 1, timeLimitMinutes: 45, startsAt: daysAgo(12), endsAt: daysAgo(11) },
    { title: "Atividade de Português — Gramática",     type: "homework" as const,    subjectName: "Língua Portuguesa", classIdx: 2, timeLimitMinutes: 35, startsAt: daysAgo(10), endsAt: daysAgo(9) },
    { title: "Simulado de Geografia",                  type: "simulado" as const,    subjectName: "Geografia",         classIdx: 0, timeLimitMinutes: 60, startsAt: daysAgo(8),  endsAt: daysAgo(7)  },
    { title: "Prova de Biologia — Genética",           type: "traditional" as const, subjectName: "Biologia",          classIdx: 2, timeLimitMinutes: 50, startsAt: daysAgo(6),  endsAt: daysAgo(5)  },
  ];

  // Provas ativas (disponíveis agora para alunos)
  const activeExams = [
    { title: "Simulado de Matemática — 3° ano",     type: "simulado" as const,    subjectName: "Matemática",        classIdx: 0, timeLimitMinutes: 60,  startsAt: daysAgo(1),    endsAt: daysFromNow(6) },
    { title: "Prova de Física — Eletromagnetismo",  type: "traditional" as const, subjectName: "Física",            classIdx: 1, timeLimitMinutes: 45,  startsAt: daysAgo(1),    endsAt: daysFromNow(5) },
    { title: "Atividade de Química — 2° ano",       type: "homework" as const,    subjectName: "Química",           classIdx: 2, timeLimitMinutes: 30,  startsAt: daysAgo(1),    endsAt: daysFromNow(4) },
    { title: "Simulado de História — 9° ano EF",    type: "simulado" as const,    subjectName: "História",          classIdx: 3, timeLimitMinutes: 45,  startsAt: daysAgo(1),    endsAt: daysFromNow(3) },
  ];

  // Provas agendadas (futuras)
  const scheduledExams = [
    { title: "Simulado ENEM Geral — 3° ano",        type: "enem" as const,        subjectName: "Matemática",        classIdx: 0, timeLimitMinutes: 180, startsAt: daysFromNow(7),  endsAt: daysFromNow(8) },
    { title: "Prova Bimestral — Língua Portuguesa", type: "traditional" as const, subjectName: "Língua Portuguesa", classIdx: 1, timeLimitMinutes: 60,  startsAt: daysFromNow(10), endsAt: daysFromNow(11) },
    { title: "Avaliação de Geografia",              type: "traditional" as const, subjectName: "Geografia",         classIdx: 2, timeLimitMinutes: 45,  startsAt: daysFromNow(14), endsAt: daysFromNow(15) },
  ];

  type ExamDef = { title: string; type: any; subjectName: string; classIdx: number; timeLimitMinutes: number; startsAt: Date; endsAt: Date };

  async function ensureExam(ed: ExamDef, status: "closed" | "active" | "scheduled"): Promise<{ id: number; subjectName: string; classIdx: number } | null> {
    const existingArr = await db.select().from(examsTable)
      .where(sql`title = ${ed.title} AND tenant_id = ${TENANT_ID}`);
    if (existingArr.length) {
      return { id: existingArr[0].id, subjectName: ed.subjectName, classIdx: ed.classIdx };
    }
    const [exam] = await db.insert(examsTable).values({
      tenantId: TENANT_ID, title: ed.title, type: ed.type, status,
      timeLimitMinutes: ed.timeLimitMinutes,
      classId: classIds[ed.classIdx],
      subjectId: subjectMap[ed.subjectName]?.id ?? null,
      isPublic: false, showResultImmediately: true,
      createdById: ADMIN_ID,
      startsAt: ed.startsAt, endsAt: ed.endsAt,
    }).returning();
    console.log(`  + [${status}] ${ed.title}`);

    // Add questions
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
    return { id: exam.id, subjectName: ed.subjectName, classIdx: ed.classIdx };
  }

  const closedExamInfos: Array<{ id: number; subjectName: string; classIdx: number; startsAt: Date }> = [];
  for (const ed of closedExams) {
    const info = await ensureExam(ed, "closed");
    if (info) closedExamInfos.push({ ...info, startsAt: ed.startsAt });
  }
  for (const ed of activeExams) await ensureExam(ed, "active");
  for (const ed of scheduledExams) await ensureExam(ed, "scheduled");

  // ── 7. SESSÕES DOS ALUNOS ─────────────────────────────────────────────────
  console.log("\n🎯 Simulando sessões de alunos...");

  // Score profiles: realistic distribution across 20 students
  const scoreProfiles = [
    0.92, 0.88, 0.85, 0.82, 0.80, 0.78, 0.75, 0.73, 0.70, 0.68,
    0.65, 0.63, 0.60, 0.57, 0.55, 0.52, 0.50, 0.47, 0.42, 0.38,
  ];

  for (const examInfo of closedExamInfos) {
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

    for (let si = 0; si < students.length; si++) {
      const studentId = students[si];
      const existingSession = await db.select().from(examSessionsTable)
        .where(sql`exam_id = ${examInfo.id} AND student_id = ${studentId}`);
      if (existingSession.length) continue;

      const targetPct = (scoreProfiles[si % scoreProfiles.length] ?? 0.6) + (Math.random() * 0.08 - 0.04);
      const startedAt = new Date(examInfo.startsAt.getTime() + rand(0, 180) * 60000);
      const submittedAt = new Date(startedAt.getTime() + rand(18, 52) * 60000);

      const [session] = await db.insert(examSessionsTable).values({
        examId: examInfo.id, studentId,
        status: "submitted", startedAt, submittedAt,
        score: "0", maxScore: String(maxScore),
      }).returning();

      let correct = 0;
      for (const q of questions) {
        const isCorrect = Math.random() < targetPct;
        const selectedOptionId = isCorrect
          ? correctOptByQ[q.id]
          : pick(allOptsByQ[q.id]?.filter(id => id !== correctOptByQ[q.id]) ?? [allOptsByQ[q.id][0]]);
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
    console.log(`  ✓ ${students.length} sessões → Prova #${examInfo.id}`);
  }

  // ── 8. ACTIVITY LOG RICO ─────────────────────────────────────────────────
  console.log("\n📊 Registrando atividades...");

  const allStudents = studentIdsByClass.flat();
  const allUserIds = [ADMIN_ID, ...teacherIds, ...allStudents.slice(0, 10)];

  const activityItems = [
    // exam_submitted x10
    { type: "exam_submitted",    desc: "Beatriz Alves concluiu Simulado ENEM",                   daysBack: 1 },
    { type: "exam_submitted",    desc: "Caio Ferreira concluiu Prova Bimestral de Matemática",    daysBack: 1 },
    { type: "exam_submitted",    desc: "Daniela Santos concluiu Avaliação de Química",            daysBack: 2 },
    { type: "exam_submitted",    desc: "Eduardo Oliveira concluiu Simulado de História",          daysBack: 2 },
    { type: "exam_submitted",    desc: "Fernanda Lima concluiu Atividade de Física",              daysBack: 3 },
    { type: "exam_submitted",    desc: "Gustavo Pereira concluiu Prova de Biologia",              daysBack: 4 },
    { type: "exam_submitted",    desc: "Helena Costa concluiu Simulado de Geografia",             daysBack: 5 },
    { type: "exam_submitted",    desc: "Igor Martins concluiu Atividade de Português",            daysBack: 6 },
    { type: "exam_submitted",    desc: "Juliana Ribeiro concluiu Avaliação Diagnóstica",          daysBack: 7 },
    { type: "exam_submitted",    desc: "Lucas Silva concluiu Prova de Biologia — Genética",      daysBack: 8 },
    // exam_created x5
    { type: "exam_created",      desc: "Prof. Carlos Mendes criou Simulado de Matemática",       daysBack: 1 },
    { type: "exam_created",      desc: "Profa. Ana Rodrigues criou Prova de Física",              daysBack: 2 },
    { type: "exam_created",      desc: "Prof. Roberto Lima criou Atividade de Química",           daysBack: 4 },
    { type: "exam_created",      desc: "Profa. Fernanda Costa criou Simulado ENEM Geral",         daysBack: 10 },
    { type: "exam_created",      desc: "Prof. Carlos Mendes criou Prova Bimestral de Português",  daysBack: 12 },
    // user_registered x5
    { type: "user_registered",   desc: "Novo aluno Alice Duarte cadastrado no 9° ano EF",        daysBack: 3 },
    { type: "user_registered",   desc: "Novo aluno Bruno Faria cadastrado no 9° ano EF",         daysBack: 5 },
    { type: "user_registered",   desc: "Nova aluna Camila Esteves cadastrada no 9° ano EF",      daysBack: 7 },
    { type: "user_registered",   desc: "Prof. Roberto Lima cadastrado como professor",            daysBack: 15 },
    { type: "user_registered",   desc: "Profa. Fernanda Costa cadastrada como professora",       daysBack: 20 },
    // class_updated x3
    { type: "class_updated",     desc: "Turma 3° A — Manhã atualizada pelo coordenador",         daysBack: 2 },
    { type: "class_updated",     desc: "Turma 9° EF — Manhã criada com 10 alunos",               daysBack: 6 },
    { type: "class_updated",     desc: "Alunos matriculados na turma 2° A — Manhã",              daysBack: 25 },
    // exam_published x2
    { type: "exam_created",      desc: "Simulado ENEM publicado para turma 3° A",                daysBack: 9 },
    { type: "exam_created",      desc: "Avaliação de Geografia agendada para próxima semana",    daysBack: 11 },
  ];

  // Only insert if activity count is low
  const existingCount = await db.select({ id: activityLogTable.id }).from(activityLogTable)
    .where(sql`tenant_id = ${TENANT_ID}`);
  if (existingCount.length < 10) {
    for (const act of activityItems) {
      const userId = act.type === "exam_created" ? pick([...teacherIds, ADMIN_ID]) :
                     act.type === "user_registered" ? ADMIN_ID :
                     pick(allUserIds);
      await db.insert(activityLogTable).values({
        tenantId: TENANT_ID, userId,
        type: act.type, description: act.desc,
        createdAt: new Date(NOW.getTime() - act.daysBack * 86400000 + rand(0, 3600000)),
      } as any);
    }
    console.log(`  + ${activityItems.length} entradas de atividade`);
  } else {
    console.log(`  (já existem ${existingCount.length} atividades, pulando)`);
  }

  console.log("\n✅ Seed concluído com sucesso!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Professores: ${TEACHERS.length}`);
  console.log(`  Alunos: ${studentGroups.flat().length} em 4 turmas`);
  console.log(`  Disciplinas: ${SUBJECTS_DATA.length}`);
  console.log(`  Provas fechadas: ${closedExams.length}`);
  console.log(`  Provas ativas: ${activeExams.length} (alunos podem fazer agora)`);
  console.log(`  Provas agendadas: ${scheduledExams.length} (futuras)`);
  console.log(`  Sessões simuladas: ~${closedExams.length * 20}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await pool.end();
}

main().catch(e => { console.error("❌ Erro:", e); process.exit(1); });
