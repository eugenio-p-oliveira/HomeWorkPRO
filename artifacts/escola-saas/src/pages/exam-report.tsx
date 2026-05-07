import { useParams, Link } from "wouter";
import { useGetExamReport } from "@workspace/api-client-react";
import { getGetExamReportQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { ArrowLeft, Trophy, Users, Target, Clock, TrendingDown, TrendingUp } from "lucide-react";
import { getScoreColor, getScoreBg } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function ExamReportPage() {
  const { id } = useParams<{ id: string }>();
  const examId = parseInt(id ?? "0");
  const { data: report, isLoading } = useGetExamReport(examId, { query: { enabled: !!examId, queryKey: getGetExamReportQueryKey(examId) } });

  if (isLoading) return <Layout><div className="p-8 text-muted-foreground">Carregando relatorio...</div></Layout>;
  if (!report) return <Layout><div className="p-8 text-muted-foreground">Relatorio nao disponivel</div></Layout>;

  const avgPct = report.averageScore != null && report.completedSessions > 0
    ? (report.averageScore / (report.questionStats.reduce((s, q) => s + q.totalAnswers > 0 ? 1 : 0, 0) || 1)) * 100 : null;

  const sortedQuestions = [...(report.questionStats ?? [])].sort((a, b) => a.correctRate - b.correctRate);

  return (
    <Layout>
      <div className="p-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/exams/${examId}`}><Button variant="ghost" size="icon" className="w-8 h-8"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-xl font-bold">{report.title}</h1>
            <p className="text-sm text-muted-foreground">Relatorio detalhado de desempenho</p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Participantes", value: report.totalSessions, icon: Users, color: "bg-blue-50 text-blue-600" },
            { label: "Concluiram", value: report.completedSessions, icon: Target, color: "bg-emerald-50 text-emerald-600" },
            { label: "Media geral", value: report.averageScore != null ? report.averageScore.toFixed(1) : "—", icon: TrendingUp, color: "bg-purple-50 text-purple-600" },
            { label: "Tempo medio", value: report.averageTimeMinutes != null ? `${Math.round(report.averageTimeMinutes)}min` : "—", icon: Clock, color: "bg-amber-50 text-amber-600" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                    <div className="text-2xl font-bold">{s.value}</div>
                  </div>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-4.5 h-4.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Score distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Distribuicao de Notas</CardTitle>
            </CardHeader>
            <CardContent>
              {report.scoreDistribution?.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={report.scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {report.scoreDistribution.map((entry, i) => (
                        <Cell key={i} fill={i === 0 ? "#ef4444" : i === 1 ? "#f59e0b" : i === 2 ? "#3b82f6" : "#10b981"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>}
            </CardContent>
          </Card>

          {/* Top students ranking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" />Ranking de Alunos</CardTitle>
            </CardHeader>
            <CardContent>
              {report.topStudents?.length > 0 ? (
                <div className="space-y-2">
                  {report.topStudents.slice(0, 6).map(s => (
                    <div key={s.userId} className="flex items-center gap-3">
                      <span className={cn("w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0",
                        s.rank === 1 ? "bg-amber-100 text-amber-700" : s.rank === 2 ? "bg-gray-100 text-gray-700" : s.rank === 3 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
                      )}>{s.rank}</span>
                      <span className="flex-1 text-sm truncate">{s.name}</span>
                      <span className={cn("text-sm font-semibold", getScoreColor(s.percentage))}>{s.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              ) : <div className="text-center text-muted-foreground text-sm py-8">Nenhuma submissao ainda</div>}
            </CardContent>
          </Card>
        </div>

        {/* Question analysis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Analise por Questao
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.questionStats?.length > 0 ? (
              <div className="space-y-3">
                {sortedQuestions.map((q, i) => (
                  <div key={q.questionId} className="space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium text-muted-foreground shrink-0">Q{i + 1}</span>
                        <span className="text-sm truncate">{q.statement}</span>
                      </div>
                      <div className={cn("text-xs font-semibold shrink-0 px-2 py-0.5 rounded border", getScoreBg(q.correctRate * 100))}>
                        {Math.round(q.correctRate * 100)}% acerto
                      </div>
                    </div>
                    <Progress value={q.correctRate * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
            ) : <div className="text-center text-muted-foreground text-sm py-6">Sem dados de resposta ainda</div>}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
