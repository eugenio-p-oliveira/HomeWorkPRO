import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useGetReportsOverview, useGetSubjectPerformance, useGetRecentActivity,
  useListClasses, useListUsers, useListSubjects, useListExams, useListSeries
} from "@workspace/api-client-react";
import {
  getClassComparison, getStudentComparison, getClassDetail,
  getStudentPrediction, getDiagnostic, getQuestionAnalysis,
  getClassRanking, getStudentTimeline,
  type ClassComparisonData, type StudentComparisonData, type ClassDetailData,
  type StudentPredictionData, type DiagnosticData, type QuestionAnalysisData,
  type ClassRankingData
} from "@/lib/bi-api";
import Layout, { PageHeader } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis
} from "recharts";
import {
  TrendingUp, Activity, BookOpen, BarChart3, CheckCircle, AlertTriangle, Users,
  ArrowRightLeft, Brain, Stethoscope, Trophy, Search, ArrowUpRight, ArrowDownRight, Equal,
  ChevronRight, Target, Zap, ShieldAlert, GraduationCap, Clock
} from "lucide-react";
import { formatDateTime, getScoreColor, getScoreBg } from "@/lib/utils";

const CHART_COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899","#84cc16"];

const activityTypeIcon: Record<string, string> = {
  exam_submitted: "Prova concluída",
  exam_created: "Prova criada",
  student_enrolled: "Aluno matriculado",
  class_created: "Turma criada",
};

// ============== VISÃO GERAL ==============
function OverviewTab() {
  const { data: overview } = useGetReportsOverview();
  const { data: subjectPerf } = useGetSubjectPerformance();
  const { data: activity } = useGetRecentActivity();

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="text-sm text-muted-foreground mb-1">Total de avaliações</div>
            <div className="text-3xl font-bold">{overview?.totalExamsSessions ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="text-sm text-muted-foreground mb-1">Média geral</div>
            <div className="text-3xl font-bold">{overview?.averageScoreAllTime != null ? overview.averageScoreAllTime.toFixed(1) : "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="text-sm text-muted-foreground mb-1">Disciplinas</div>
            <div className="text-3xl font-bold">{subjectPerf?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="text-sm text-muted-foreground mb-1">Alunos em risco</div>
            <div className={`text-3xl font-bold ${(overview?.atRiskStudents?.length ?? 0) > 0 ? "text-red-500" : "text-emerald-500"}`}>
              {overview?.atRiskStudents?.length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top/Bottom class */}
      {overview?.topPerformingClass && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Turma com melhor desempenho
              </div>
              <div className="text-xl font-bold">{overview.topPerformingClass.className}</div>
              <div className="text-sm text-muted-foreground">Média {overview.topPerformingClass.averageScore.toFixed(1)}%</div>
            </CardContent>
          </Card>
          {overview?.lowestPerformingClass && (
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Turma com menor desempenho
                </div>
                <div className="text-xl font-bold">{overview.lowestPerformingClass.className}</div>
                <div className="text-sm text-muted-foreground">Média {overview.lowestPerformingClass.averageScore.toFixed(1)}%</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* At-risk students list */}
      {overview?.atRiskStudents && overview.atRiskStudents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              Alunos em Risco de Queda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overview.atRiskStudents.slice(0, 8).map(st => (
                <div key={st.studentId} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: st.riskColor }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{st.studentName}</div>
                    <div className="text-xs text-muted-foreground">{st.examsCount} provas · média {st.averagePercentage.toFixed(1)}%</div>
                  </div>
                  <Badge style={{ backgroundColor: st.riskColor + "20", color: st.riskColor, borderColor: st.riskColor }} variant="outline">
                    {st.riskLabel}
                  </Badge>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {st.trendSlope > 0 ? <ArrowUpRight className="w-3 h-3 inline text-emerald-500" /> : <ArrowDownRight className="w-3 h-3 inline text-red-500" />}
                    {Math.abs(st.trendSlope).toFixed(1)}%/prova
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Class stats table */}
      {overview?.classStats && overview.classStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Desempenho por Turma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-muted-foreground">Turma</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">Alunos</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">Avaliações</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">Média</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">Turno</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.classStats.map(c => (
                    <tr key={c.classId} className="border-b border-border/50">
                      <td className="py-2 font-medium">{c.className}</td>
                      <td className="text-center py-2">{c.studentsCount}</td>
                      <td className="text-center py-2">{c.count}</td>
                      <td className="text-center py-2 font-semibold" style={{ color: c.averageScore >= 70 ? "#10b981" : c.averageScore >= 50 ? "#f59e0b" : "#ef4444" }}>
                        {c.averageScore.toFixed(1)}%
                      </td>
                      <td className="text-center py-2 capitalize">{c.shift}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Atividade Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {overview?.monthlyActivity && overview.monthlyActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={overview.monthlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sessionsCount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Avaliações" />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados de atividade</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />Desempenho por Disciplina</CardTitle>
          </CardHeader>
          <CardContent>
            {subjectPerf && subjectPerf.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={subjectPerf.filter(s => s.totalAttempts > 0).map(s => ({ name: s.subjectName.slice(0, 12), media: Number((s.averageScore ?? 0).toFixed(1)) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip formatter={(v: any) => [`${v}%`, "Média"]} />
                  <Bar dataKey="media" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    {subjectPerf.filter(s => s.totalAttempts > 0).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados por disciplina</div>}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {activity && activity.length > 0 ? (
            <div className="space-y-3">
              {activity.map(a => (
                <div key={a.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm text-foreground">{a.description}</div>
                    <div className="text-xs text-muted-foreground">{a.userName} · {formatDateTime(a.createdAt)}</div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{activityTypeIcon[a.type] ?? a.type}</span>
                </div>
              ))}
            </div>
          ) : <div className="text-center text-muted-foreground text-sm py-8">Nenhuma atividade registrada</div>}
        </CardContent>
      </Card>
    </div>
  );
}

// ============== COMPARADOR ==============
function ComparisonTab() {
  const { data: classes } = useListClasses({});
  const { data: users } = useListUsers({});
  const { data: subjects } = useListSubjects();
  const { data: series } = useListSeries();

  const [compareMode, setCompareMode] = useState<"classes" | "students">("classes");
  const [classA, setClassA] = useState<string>("");
  const [classB, setClassB] = useState<string>("");
  const [studentA, setStudentA] = useState<string>("");
  const [studentB, setStudentB] = useState<string>("");
  const [compSubject, setCompSubject] = useState<string>("");

  const classCompareQuery = useQuery<ClassComparisonData>({
    queryKey: ["class-comparison", classA, classB, compSubject],
    queryFn: () => getClassComparison(Number(classA), Number(classB), compSubject ? Number(compSubject) : undefined),
    enabled: compareMode === "classes" && !!classA && !!classB && classA !== classB,
  });

  const studentCompareQuery = useQuery<StudentComparisonData>({
    queryKey: ["student-comparison", studentA, studentB],
    queryFn: () => getStudentComparison(Number(studentA), Number(studentB)),
    enabled: compareMode === "students" && !!studentA && !!studentB && studentA !== studentB,
  });

  const students = useMemo(() => (users ?? []).filter(u => u.role === "student"), [users]);
  const classList = useMemo(() => classes ?? [], [classes]);
  const className = (cls: any) => {
    const s = (series ?? []).find((x: any) => x.id === cls.serieId);
    return `${s?.name ?? ""} ${cls.name}`.trim();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Badge variant={compareMode === "classes" ? "default" : "outline"} className="cursor-pointer" onClick={() => setCompareMode("classes")}>
          <ArrowRightLeft className="w-3 h-3 mr-1" /> Turmas
        </Badge>
        <Badge variant={compareMode === "students" ? "default" : "outline"} className="cursor-pointer" onClick={() => setCompareMode("students")}>
          <Users className="w-3 h-3 mr-1" /> Alunos
        </Badge>
      </div>

      {compareMode === "classes" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Turma A</label>
              <Select value={classA} onValueChange={setClassA}>
                <SelectTrigger><SelectValue placeholder="Selecionar turma" /></SelectTrigger>
                <SelectContent>
                  {classList.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{className(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Turma B</label>
              <Select value={classB} onValueChange={setClassB}>
                <SelectTrigger><SelectValue placeholder="Selecionar turma" /></SelectTrigger>
                <SelectContent>
                  {classList.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{className(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Disciplina (opcional)</label>
              <Select value={compSubject} onValueChange={setCompSubject}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas</SelectItem>
                  {(subjects ?? []).map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {classCompareQuery.data && (
            <div className="space-y-6">
              {/* Insight */}
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-2">
                    <Zap className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-amber-800 text-sm">Insight</div>
                      <div className="text-sm text-amber-700">{classCompareQuery.data.insight}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Side-by-side stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2"><CardTitle className="text-base">{classCompareQuery.data.classA.className}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Alunos</span><span className="font-medium">{classCompareQuery.data.classA.studentsCount}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Avaliações</span><span className="font-medium">{classCompareQuery.data.classA.totalSessions}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Média</span><span className="font-medium text-blue-600">{classCompareQuery.data.classA.averageScore.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Mediana</span><span className="font-medium">{classCompareQuery.data.classA.medianScore.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Mín</span><span className="font-medium">{classCompareQuery.data.classA.minScore.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Máx</span><span className="font-medium">{classCompareQuery.data.classA.maxScore.toFixed(1)}%</span></div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2"><CardTitle className="text-base">{classCompareQuery.data.classB.className}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Alunos</span><span className="font-medium">{classCompareQuery.data.classB.studentsCount}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Avaliações</span><span className="font-medium">{classCompareQuery.data.classB.totalSessions}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Média</span><span className="font-medium text-purple-600">{classCompareQuery.data.classB.averageScore.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Mediana</span><span className="font-medium">{classCompareQuery.data.classB.medianScore.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Mín</span><span className="font-medium">{classCompareQuery.data.classB.minScore.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Máx</span><span className="font-medium">{classCompareQuery.data.classB.maxScore.toFixed(1)}%</span></div>
                  </CardContent>
                </Card>
              </div>

              {/* Subject comparison radar */}
              {classCompareQuery.data.sharedSubjectComparison.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Comparativo por Disciplina</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={classCompareQuery.data.sharedSubjectComparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="subjectName" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: any, name: any) => [`${Number(v).toFixed(1)}%`, name === "classA" ? classCompareQuery.data.classA.className : classCompareQuery.data.classB.className]} />
                        <Legend />
                        <Bar dataKey="classA" name={classCompareQuery.data.classA.className} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="classB" name={classCompareQuery.data.classB.className} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Top/bottom students */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-600">Top 3 — {classCompareQuery.data.classA.className}</CardTitle></CardHeader>
                  <CardContent>
                    {classCompareQuery.data.classA.topStudents.map((s: any, i: number) => (
                      <div key={s.studentId} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                        <span className="text-xs font-bold w-5">{i + 1}</span>
                        <span className="text-sm flex-1">{s.studentName}</span>
                        <span className="text-sm font-medium">{s.average.toFixed(1)}%</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-purple-600">Top 3 — {classCompareQuery.data.classB.className}</CardTitle></CardHeader>
                  <CardContent>
                    {classCompareQuery.data.classB.topStudents.map((s: any, i: number) => (
                      <div key={s.studentId} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                        <span className="text-xs font-bold w-5">{i + 1}</span>
                        <span className="text-sm flex-1">{s.studentName}</span>
                        <span className="text-sm font-medium">{s.average.toFixed(1)}%</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {compareMode === "students" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Aluno A</label>
              <Select value={studentA} onValueChange={setStudentA}>
                <SelectTrigger><SelectValue placeholder="Selecionar aluno" /></SelectTrigger>
                <SelectContent>
                  {students.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Aluno B</label>
              <Select value={studentB} onValueChange={setStudentB}>
                <SelectTrigger><SelectValue placeholder="Selecionar aluno" /></SelectTrigger>
                <SelectContent>
                  {students.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {studentCompareQuery.data && (
            <div className="space-y-6">
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-2">
                    <Zap className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-amber-800 text-sm">Insight</div>
                      <div className="text-sm text-amber-700">{studentCompareQuery.data.insight}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{studentCompareQuery.data.studentA.studentName}</CardTitle>
                    <div className="text-xs text-muted-foreground">{studentCompareQuery.data.studentA.totalExams} provas</div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Média</span><span className="font-medium text-blue-600">{studentCompareQuery.data.studentA.averageScore.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tendência</span><span className={`font-medium ${studentCompareQuery.data.studentA.trendSlope > 0 ? "text-emerald-600" : "text-red-600"}`}>{studentCompareQuery.data.studentA.trendSlope > 0 ? "↑" : "↓"} {Math.abs(studentCompareQuery.data.studentA.trendSlope).toFixed(1)}%/prova</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Risco</span>
                      <Badge style={{ backgroundColor: studentCompareQuery.data.studentA.riskColor + "20", color: studentCompareQuery.data.studentA.riskColor, borderColor: studentCompareQuery.data.studentA.riskColor }} variant="outline">
                        {studentCompareQuery.data.studentA.riskLabel}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{studentCompareQuery.data.studentB.studentName}</CardTitle>
                    <div className="text-xs text-muted-foreground">{studentCompareQuery.data.studentB.totalExams} provas</div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Média</span><span className="font-medium text-purple-600">{studentCompareQuery.data.studentB.averageScore.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tendência</span><span className={`font-medium ${studentCompareQuery.data.studentB.trendSlope > 0 ? "text-emerald-600" : "text-red-600"}`}>{studentCompareQuery.data.studentB.trendSlope > 0 ? "↑" : "↓"} {Math.abs(studentCompareQuery.data.studentB.trendSlope).toFixed(1)}%/prova</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Risco</span>
                      <Badge style={{ backgroundColor: studentCompareQuery.data.studentB.riskColor + "20", color: studentCompareQuery.data.studentB.riskColor, borderColor: studentCompareQuery.data.studentB.riskColor }} variant="outline">
                        {studentCompareQuery.data.studentB.riskLabel}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline comparison */}
              {studentCompareQuery.data.studentA.timeline.length > 0 && studentCompareQuery.data.studentB.timeline.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução Temporal</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={
                        // Merge by index
                        Array.from({ length: Math.max(studentCompareQuery.data.studentA.timeline.length, studentCompareQuery.data.studentB.timeline.length) }, (_, i) => ({
                          idx: i + 1,
                          a: studentCompareQuery.data.studentA.timeline[i]?.score ?? null,
                          b: studentCompareQuery.data.studentB.timeline[i]?.score ?? null,
                        }))
                      }>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="idx" tick={{ fontSize: 11 }} label={{ value: "Prova #", position: "insideBottom", offset: -5 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="a" name={studentCompareQuery.data.studentA.studentName} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        <Line type="monotone" dataKey="b" name={studentCompareQuery.data.studentB.studentName} stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Radar by subject */}
              {studentCompareQuery.data.sharedSubjectComparison.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Desempenho por Disciplina</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={studentCompareQuery.data.sharedSubjectComparison}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subjectName" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Radar name={studentCompareQuery.data.studentA.studentName} dataKey="studentA" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        <Radar name={studentCompareQuery.data.studentB.studentName} dataKey="studentB" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                        <Legend />
                        <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============== PREDIÇÃO ==============
function PredictionTab() {
  const predictionQuery = useQuery<StudentPredictionData>({
    queryKey: ["student-prediction"],
    queryFn: getStudentPrediction,
  });

  const predictions = predictionQuery.data?.predictions ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="text-sm text-muted-foreground mb-1">Total analisado</div>
            <div className="text-3xl font-bold">{predictions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="text-sm text-muted-foreground mb-1">Risco Crítico</div>
            <div className="text-3xl font-bold text-red-500">{predictions.filter(p => p.riskLevel === "critical").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="text-sm text-muted-foreground mb-1">Risco Alto</div>
            <div className="text-3xl font-bold text-amber-500">{predictions.filter(p => p.riskLevel === "high").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="text-sm text-muted-foreground mb-1">Risco Moderado</div>
            <div className="text-3xl font-bold text-orange-500">{predictions.filter(p => p.riskLevel === "medium").length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {predictions.map(p => (
          <Card key={p.studentId} className="overflow-hidden">
            <div className="h-1" style={{ backgroundColor: p.riskColor }} />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{p.studentName}</CardTitle>
                <Badge style={{ backgroundColor: p.riskColor + "20", color: p.riskColor, borderColor: p.riskColor }} variant="outline">
                  {p.riskLabel}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">{p.examsCount} provas · Média {p.averagePercentage.toFixed(1)}% · Próxima prevista: {p.predictedNextScore.toFixed(1)}%</div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Timeline mini chart */}
              {p.timeline.length > 1 && (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={p.timeline.map((t: any, i: number) => ({ idx: i + 1, score: t.score }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="idx" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                    <Line type="monotone" dataKey="score" stroke={p.riskColor} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* Weak subjects */}
              {p.weakSubjects.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1.5">Disciplinas mais fracas</div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.weakSubjects.map((s: any) => (
                      <Badge key={s.subjectId} variant="secondary" className="text-xs">{s.subjectName}: {s.average.toFixed(1)}%</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Trend */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Tendência:</span>
                <span className={p.trendSlope > 0 ? "text-emerald-600" : "text-red-600"}>
                  {p.trendSlope > 0 ? "↑" : "↓"} {Math.abs(p.trendSlope).toFixed(1)}%/prova (R² = {p.trendR2.toFixed(2)})
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {predictions.length === 0 && (
        <div className="text-center text-muted-foreground py-12">Nenhum aluno com dados suficientes para predição (mínimo 2 provas)</div>
      )}
    </div>
  );
}

// ============== DIAGNÓSTICO ==============
function DiagnosticTab() {
  const { data: classes } = useListClasses({});
  const { data: subjects } = useListSubjects();
  const [diagClass, setDiagClass] = useState<string>("");
  const [diagSubject, setDiagSubject] = useState<string>("");

  const diagnosticQuery = useQuery<DiagnosticData>({
    queryKey: ["diagnostic", diagClass, diagSubject],
    queryFn: () => getDiagnostic(diagClass ? Number(diagClass) : undefined, diagSubject ? Number(diagSubject) : undefined),
  });

  const data = diagnosticQuery.data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Turma (opcional)</label>
          <Select value={diagClass} onValueChange={setDiagClass}>
            <SelectTrigger><SelectValue placeholder="Toda a instituição" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Toda a instituição</SelectItem>
              {(classes ?? []).map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Disciplina (opcional)</label>
          <Select value={diagSubject} onValueChange={setDiagSubject}>
            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas</SelectItem>
              {(subjects ?? []).map((s: any) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          {data.summary && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2">
                  <Brain className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-800">{data.summary}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low students */}
          {data.lowStudents.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Alunos com Baixo Desempenho
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium text-muted-foreground">Aluno</th>
                        <th className="text-center py-2 font-medium text-muted-foreground">Provas</th>
                        <th className="text-center py-2 font-medium text-muted-foreground">Média</th>
                        <th className="text-center py-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lowStudents.map((s: any) => (
                        <tr key={s.studentId} className="border-b border-border/50">
                          <td className="py-2 font-medium">{s.studentName}</td>
                          <td className="text-center py-2">{s.count}</td>
                          <td className="text-center py-2 font-semibold text-red-600">{s.average.toFixed(1)}%</td>
                          <td className="text-center py-2">
                            <Badge variant="destructive" className="text-xs">Abaixo de 50%</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Topic analysis */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary" />
                Análise por Tópico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topicAnalysis.map((t: any) => (
                  <div key={t.topicId} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium text-sm">{t.topicName}</div>
                        <div className="text-xs text-muted-foreground">{t.subjectName} · {t.totalAnswers} respostas · {t.studentsAffected} alunos</div>
                      </div>
                      <Badge
                        variant={t.diagnosisType === "approach" ? "destructive" : t.diagnosisType === "mixed" ? "default" : "secondary"}
                        className="text-xs shrink-0"
                      >
                        {t.diagnosisType === "approach" ? "Problema de Abordagem" : t.diagnosisType === "mixed" ? "Misto" : "Individual"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${t.errorRate}%` }} />
                      </div>
                      <span className="text-xs font-medium w-12 text-right">{t.errorRate.toFixed(1)}% erro</span>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      <strong>Diagnóstico:</strong> {t.diagnosisMessage}
                    </div>
                    <div className="text-xs text-amber-700 bg-amber-50 rounded p-2 mt-1">
                      <strong>Recomendação:</strong> {t.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============== RANKING ==============
function RankingTab() {
  const rankingQuery = useQuery<ClassRankingData>({
    queryKey: ["class-ranking"],
    queryFn: getClassRanking,
  });

  const rankings = rankingQuery.data?.rankings ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-500" />Ranking de Turmas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-center py-2 font-medium text-muted-foreground w-12">#</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Turma</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Alunos</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Avaliações</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Média</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Em Risco</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Disciplinas</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r: any, i: number) => (
                  <tr key={r.classId} className="border-b border-border/50">
                    <td className="text-center py-3">
                      {i === 0 ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">1</span> :
                        i === 1 ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">2</span> :
                        i === 2 ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">3</span> :
                        <span className="text-xs text-muted-foreground">{i + 1}</span>}
                    </td>
                    <td className="py-3 font-medium">{r.className}</td>
                    <td className="text-center py-3">{r.studentsCount}</td>
                    <td className="text-center py-3">{r.totalSessions}</td>
                    <td className="text-center py-3 font-semibold" style={{ color: r.averageScore >= 70 ? "#10b981" : r.averageScore >= 50 ? "#f59e0b" : "#ef4444" }}>
                      {r.averageScore.toFixed(1)}%
                    </td>
                    <td className="text-center py-3">
                      {r.atRiskCount > 0 ? (
                        <Badge variant="destructive" className="text-xs">{r.atRiskCount}</Badge>
                      ) : (
                        <span className="text-xs text-emerald-600">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.subjectBreakdown.slice(0, 3).map((s: any) => (
                          <span key={s.subjectId} className="text-xs bg-muted rounded px-1.5 py-0.5">
                            {s.subjectName}: {s.average.toFixed(0)}%
                          </span>
                        ))}
                        {r.subjectBreakdown.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{r.subjectBreakdown.length - 3}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Ranking chart */}
      {rankings.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Ranking Visual</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={rankings.length * 40 + 40}>
              <BarChart data={rankings.map((r: any) => ({ name: r.className, media: r.averageScore, risco: r.atRiskCount }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={150} />
                <Tooltip />
                <Legend />
                <Bar dataKey="media" name="Média (%)" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="risco" name="Alunos em risco" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============== DETALHAMENTO POR TURMA ==============
function DetailTab() {
  const { data: classes } = useListClasses({});
  const { data: exams } = useListExams({});
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedExam, setSelectedExam] = useState<string>("");

  const classDetailQuery = useQuery<ClassDetailData>({
    queryKey: ["class-detail", selectedClass],
    queryFn: () => getClassDetail(Number(selectedClass)),
    enabled: !!selectedClass,
  });

  const questionAnalysisQuery = useQuery<QuestionAnalysisData>({
    queryKey: ["question-analysis", selectedExam],
    queryFn: () => getQuestionAnalysis(Number(selectedExam)),
    enabled: !!selectedExam,
  });

  const detail = classDetailQuery.data;
  const qAnalysis = questionAnalysisQuery.data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Turma</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger><SelectValue placeholder="Selecionar turma" /></SelectTrigger>
            <SelectContent>
              {(classes ?? []).map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Prova (para análise de questões)</label>
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger><SelectValue placeholder="Selecionar prova" /></SelectTrigger>
            <SelectContent>
              {(exams ?? []).map((e: any) => (
                <SelectItem key={e.id} value={String(e.id)}>{e.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {detail && (
        <div className="space-y-6">
          {/* Class summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-5 pb-5">
              <div className="text-sm text-muted-foreground mb-1">Alunos</div>
              <div className="text-3xl font-bold">{detail.studentsCount}</div>
            </CardContent></Card>
            <Card><CardContent className="pt-5 pb-5">
              <div className="text-sm text-muted-foreground mb-1">Avaliações</div>
              <div className="text-3xl font-bold">{detail.totalSessions}</div>
            </CardContent></Card>
            <Card><CardContent className="pt-5 pb-5">
              <div className="text-sm text-muted-foreground mb-1">Média</div>
              <div className="text-3xl font-bold">{detail.averageScore.toFixed(1)}%</div>
            </CardContent></Card>
            <Card><CardContent className="pt-5 pb-5">
              <div className="text-sm text-muted-foreground mb-1">Em risco</div>
              <div className="text-3xl font-bold text-red-500">{detail.students.filter((s: any) => s.riskLevel !== "low").length}</div>
            </CardContent></Card>
          </div>

          {/* Students table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" />Alunos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">Aluno</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">Provas</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">Média</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">Tendência</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">Risco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.students.map((s: any) => (
                      <tr key={s.studentId} className="border-b border-border/50">
                        <td className="py-2 font-medium">{s.studentName}</td>
                        <td className="text-center py-2">{s.examsCount}</td>
                        <td className="text-center py-2 font-semibold" style={{ color: s.averageScore >= 70 ? "#10b981" : s.averageScore >= 50 ? "#f59e0b" : "#ef4444" }}>
                          {s.averageScore.toFixed(1)}%
                        </td>
                        <td className="text-center py-2">
                          {s.trendSlope > 0 ? <ArrowUpRight className="w-4 h-4 inline text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 inline text-red-500" />}
                          <span className="text-xs ml-1">{Math.abs(s.trendSlope).toFixed(1)}%</span>
                        </td>
                        <td className="text-center py-2">
                          <Badge style={{ backgroundColor: s.riskColor + "20", color: s.riskColor, borderColor: s.riskColor }} variant="outline" className="text-xs">
                            {s.riskLabel}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Subject breakdown */}
          {detail.subjectBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Desempenho por Disciplina</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={detail.subjectBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subjectName" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                    <Bar dataKey="average" name="Média" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Topic analysis */}
          {detail.topicAnalysis.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Análise por Tópico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {detail.topicAnalysis.map((t: any) => (
                    <div key={t.topicId} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium text-sm">{t.topicName}</div>
                          <div className="text-xs text-muted-foreground">{t.subjectName} · {t.totalAnswers} respostas · {t.studentsAffected} alunos</div>
                        </div>
                        <Badge
                          variant={t.diagnosisType === "approach" ? "destructive" : t.diagnosisType === "mixed" ? "default" : "secondary"}
                          className="text-xs shrink-0"
                        >
                          {t.diagnosisType === "approach" ? "Problema de Abordagem" : t.diagnosisType === "mixed" ? "Misto" : "Individual"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mb-1">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${t.errorRate}%` }} />
                        </div>
                        <span className="text-xs font-medium w-12 text-right">{t.errorRate.toFixed(1)}% erro</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{t.diagnosisMessage}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Question analysis */}
      {qAnalysis && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Análise por Questão — {qAnalysis.examTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {qAnalysis.analysis.map((q: any) => (
                <div key={q.questionId} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium pr-4">{q.statement.slice(0, 80)}{q.statement.length > 80 ? "..." : ""}</div>
                    <Badge variant={q.correctRate >= 60 ? "secondary" : q.correctRate >= 40 ? "default" : "destructive"} className="text-xs shrink-0">
                      {q.correctRate.toFixed(0)}% acerto
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${q.correctRate}%` }} />
                    </div>
                    <span className="text-xs font-medium w-16 text-right">{q.errorRate.toFixed(1)}% erro</span>
                  </div>
                  {q.topicName && <div className="text-xs text-muted-foreground mt-1">Tópico: {q.topicName}</div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============== MAIN PAGE ==============
export default function ReportsPage() {
  return (
    <Layout>
      <div className="p-4 md:p-8">
        <PageHeader title="Relatórios BI" description="Análise avançada, predição, comparadores e diagnóstico pedagógico" />

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="mb-6 flex-wrap h-auto">
            <TabsTrigger value="overview" className="gap-1"><BarChart3 className="w-3.5 h-3.5" /> Visão Geral</TabsTrigger>
            <TabsTrigger value="comparison" className="gap-1"><ArrowRightLeft className="w-3.5 h-3.5" /> Comparador</TabsTrigger>
            <TabsTrigger value="prediction" className="gap-1"><Brain className="w-3.5 h-3.5" /> Predição</TabsTrigger>
            <TabsTrigger value="diagnostic" className="gap-1"><Stethoscope className="w-3.5 h-3.5" /> Diagnóstico</TabsTrigger>
            <TabsTrigger value="ranking" className="gap-1"><Trophy className="w-3.5 h-3.5" /> Ranking</TabsTrigger>
            <TabsTrigger value="detail" className="gap-1"><Search className="w-3.5 h-3.5" /> Detalhamento</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="comparison"><ComparisonTab /></TabsContent>
          <TabsContent value="prediction"><PredictionTab /></TabsContent>
          <TabsContent value="diagnostic"><DiagnosticTab /></TabsContent>
          <TabsContent value="ranking"><RankingTab /></TabsContent>
          <TabsContent value="detail"><DetailTab /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
