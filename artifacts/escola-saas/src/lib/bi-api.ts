import { customFetch } from "@workspace/api-client-react/src/custom-fetch";

function getToken() {
  return localStorage.getItem("edusaas_token");
}

async function biPost<T>(path: string, body: unknown): Promise<T> {
  return customFetch<T>(`/api/reports${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });
}

async function biGet<T>(path: string): Promise<T> {
  return customFetch<T>(`/api/reports${path}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
}

// ===== Types =====

export interface StudentBrief {
  studentId: number;
  studentName: string;
  average: number;
  count: number;
}

export interface SubjectBreakdown {
  subjectId: number;
  subjectName: string;
  average: number;
  count: number;
}

export interface ClassComparisonData {
  classA: {
    classId: number;
    className: string;
    studentsCount: number;
    totalSessions: number;
    averageScore: number;
    medianScore: number;
    minScore: number;
    maxScore: number;
    subjectBreakdown: SubjectBreakdown[];
    topStudents: StudentBrief[];
    bottomStudents: StudentBrief[];
  };
  classB: {
    classId: number;
    className: string;
    studentsCount: number;
    totalSessions: number;
    averageScore: number;
    medianScore: number;
    minScore: number;
    maxScore: number;
    subjectBreakdown: SubjectBreakdown[];
    topStudents: StudentBrief[];
    bottomStudents: StudentBrief[];
  };
  sharedSubjectComparison: { subjectName: string; classA: number; classB: number; difference: number }[];
  scoreDifference: number;
  insight: string;
}

export interface TimelinePoint {
  examId: number;
  examTitle: string;
  date: string;
  score: number;
}

export interface StudentComparisonData {
  studentA: {
    studentId: number;
    studentName: string;
    averageScore: number;
    totalExams: number;
    timeline: TimelinePoint[];
    trendSlope: number;
    trendR2: number;
    riskLevel: string;
    riskLabel: string;
    riskColor: string;
    subjectBreakdown: SubjectBreakdown[];
  };
  studentB: {
    studentId: number;
    studentName: string;
    averageScore: number;
    totalExams: number;
    timeline: TimelinePoint[];
    trendSlope: number;
    trendR2: number;
    riskLevel: string;
    riskLabel: string;
    riskColor: string;
    subjectBreakdown: SubjectBreakdown[];
  };
  sharedSubjectComparison: { subjectName: string; studentA: number; studentB: number; difference: number }[];
  scoreDifference: number;
  insight: string;
}

export interface StudentInClass {
  studentId: number;
  studentName: string;
  averageScore: number;
  examsCount: number;
  trendSlope: number;
  trendR2: number;
  riskLevel: string;
  riskLabel: string;
  riskColor: string;
}

export interface TopicAnalysis {
  topicId: number;
  topicName: string;
  subjectName: string;
  totalAnswers: number;
  correctRate: number;
  errorRate: number;
  studentsAffected: number;
  diagnosisType: string;
  diagnosisMessage: string;
  recommendation?: string;
}

export interface ClassDetailData {
  classId: number;
  className: string;
  studentsCount: number;
  totalSessions: number;
  averageScore: number;
  students: StudentInClass[];
  subjectBreakdown: SubjectBreakdown[];
  topicAnalysis: TopicAnalysis[];
}

export interface WeakSubject {
  subjectId: number;
  subjectName: string;
  average: number;
}

export interface PredictionItem {
  studentId: number;
  studentName: string;
  averagePercentage: number;
  trendSlope: number;
  trendR2: number;
  riskLevel: string;
  riskLabel: string;
  riskColor: string;
  predictedNextScore: number;
  examsCount: number;
  weakSubjects: WeakSubject[];
  timeline: { examTitle: string; score: number }[];
}

export interface StudentPredictionData {
  predictions: PredictionItem[];
}

export interface LowStudent {
  studentId: number;
  studentName: string;
  average: number;
  count: number;
}

export interface DiagnosticData {
  scope: { classId: number | null; className: string };
  lowStudents: LowStudent[];
  topicAnalysis: TopicAnalysis[];
  summary: string;
}

export interface QuestionAnalysisItem {
  questionId: number;
  statement: string;
  topicName: string | null;
  totalAnswers: number;
  correctRate: number;
  errorRate: number;
  byOption: { optionId: number; count: number; percentage: number }[];
}

export interface QuestionAnalysisData {
  examId: number;
  examTitle: string;
  analysis: QuestionAnalysisItem[];
}

export interface RankingItem {
  classId: number;
  className: string;
  studentsCount: number;
  totalSessions: number;
  averageScore: number;
  subjectBreakdown: SubjectBreakdown[];
  atRiskCount: number;
}

export interface ClassRankingData {
  rankings: RankingItem[];
}

export interface SubjectWise {
  subjectId: number;
  subjectName: string;
  average: number;
  trendSlope: number;
  trendR2: number;
  riskLevel: string;
  riskLabel: string;
  riskColor: string;
  exams: { examId: number; examTitle: string; subjectName: string; date: string; score: number; maxScore: number; percentage: number }[];
}

export interface StudentTimelineData {
  studentId: number;
  studentName: string;
  timeline: { examId: number; examTitle: string; subjectName: string; date: string; score: number; maxScore: number; percentage: number }[];
  subjectWise: SubjectWise[];
  overall: {
    average: number;
    trendSlope: number;
    trendR2: number;
    riskLevel: string;
    riskLabel: string;
    riskColor: string;
  };
}

// ===== API functions =====

export function getClassComparison(classA: number, classB: number, subjectId?: number) {
  return biPost<ClassComparisonData>("/class-comparison", { classA, classB, subjectId });
}

export function getStudentComparison(studentA: number, studentB: number) {
  return biPost<StudentComparisonData>("/student-comparison", { studentA, studentB });
}

export function getClassDetail(classId: number) {
  return biGet<ClassDetailData>(`/class-detail/${classId}`);
}

export function getStudentPrediction() {
  return biGet<StudentPredictionData>("/student-prediction");
}

export function getDiagnostic(classId?: number, subjectId?: number) {
  const params = new URLSearchParams();
  if (classId) params.append("classId", String(classId));
  if (subjectId) params.append("subjectId", String(subjectId));
  return biGet<DiagnosticData>(`/diagnostic?${params.toString()}`);
}

export function getQuestionAnalysis(examId: number) {
  return biGet<QuestionAnalysisData>(`/question-analysis?examId=${examId}`);
}

export function getClassRanking() {
  return biGet<ClassRankingData>("/class-ranking");
}

export function getStudentTimeline(studentId: number) {
  return biGet<StudentTimelineData>(`/student-timeline/${studentId}`);
}
