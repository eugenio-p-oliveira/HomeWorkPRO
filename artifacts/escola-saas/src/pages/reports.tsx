import { useGetReportsOverview, useGetSubjectPerformance, useGetRecentActivity } from "@workspace/api-client-react";
import Layout, { PageHeader } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { TrendingUp, Activity, BookOpen, BarChart3, CheckCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

const CHART_COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4"];

const activityTypeIcon: Record<string, string> = {
  exam_submitted: "Prova concluida",
  exam_created: "Prova criada",
  student_enrolled: "Aluno matriculado",
  class_created: "Turma criada",
};

export default function ReportsPage() {
  const { data: overview } = useGetReportsOverview();
  const { data: subjectPerf } = useGetSubjectPerformance();
  const { data: activity } = useGetRecentActivity();

  return (
    <Layout>
      <div className="p-8">
        <PageHeader title="Relatorios" description="Analise de desempenho e atividade institucional" />

        {/* Overview stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="text-sm text-muted-foreground mb-1">Total de avaliacoes</div>
              <div className="text-3xl font-bold">{overview?.totalExamsSessions ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="text-sm text-muted-foreground mb-1">Media geral</div>
              <div className="text-3xl font-bold">
                {overview?.averageScoreAllTime != null ? overview.averageScoreAllTime.toFixed(1) : "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="text-sm text-muted-foreground mb-1">Disciplinas</div>
              <div className="text-3xl font-bold">{subjectPerf?.length ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly activity */}
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
                    <Line type="monotone" dataKey="sessionsCount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Avaliacoes" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados de atividade</div>}
            </CardContent>
          </Card>

          {/* Subject performance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />Tentativas por Disciplina</CardTitle>
            </CardHeader>
            <CardContent>
              {subjectPerf && subjectPerf.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={subjectPerf.map(s => ({ name: s.subjectName.slice(0, 12), tentativas: s.totalAttempts }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="tentativas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                      {subjectPerf.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
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
    </Layout>
  );
}
