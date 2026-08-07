import { useGetTenantStats, useGetRecentActivity, useGetSubjectPerformance } from "@workspace/api-client-react";
import Layout, { PageHeader } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, GraduationCap, FileText, TrendingUp, Activity, BookOpen, CheckCircle, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Link } from "wouter";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-1">{label}</div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const activityTypeLabel: Record<string, string> = {
  exam_submitted: "Prova submetida",
  exam_created: "Prova criada",
  student_enrolled: "Aluno matriculado",
  class_created: "Turma criada",
};

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetTenantStats();
  const { data: activity } = useGetRecentActivity();
  const { data: subjectPerf } = useGetSubjectPerformance();
  const setupSteps = [
    { label: "Configurar séries", done: (stats?.totalClasses ?? 0) > 0, href: "/series" },
    { label: "Criar uma turma", done: (stats?.totalClasses ?? 0) > 0, href: "/classes" },
    { label: "Adicionar usuários", done: (stats?.totalStudents ?? 0) > 0 && (stats?.totalTeachers ?? 0) > 0, href: "/users" },
    { label: "Criar a primeira prova", done: (stats?.totalExams ?? 0) > 0, href: "/exams" },
  ];
  const setupComplete = setupSteps.filter(step => step.done).length;

  return (
    <Layout>
      <div className="p-8">
        <PageHeader title="Dashboard" description="Visão geral da instituição" />

        {stats && setupComplete < setupSteps.length && (
          <Card className="mb-8 border-primary/20 bg-primary/[0.03]">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Configure sua instituição</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete estes passos para começar a acompanhar sua primeira turma.
                  </p>
                </div>
                <Badge variant="secondary">{setupComplete}/{setupSteps.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                {setupSteps.map(step => (
                  <Link key={step.label} href={step.href} className="group">
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-3 transition-colors group-hover:border-primary/40">
                      {step.done
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />}
                      <span className={`text-sm ${step.done ? "text-muted-foreground line-through" : "font-medium"}`}>{step.label}</span>
                      {!step.done && <ArrowRight className="w-3.5 h-3.5 ml-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />) : (
            <>
              <StatCard label="Alunos" value={stats?.totalStudents ?? 0} icon={Users} color="bg-blue-50 text-blue-600" />
              <StatCard label="Professores" value={stats?.totalTeachers ?? 0} icon={GraduationCap} color="bg-purple-50 text-purple-600" />
              <StatCard label="Turmas" value={stats?.totalClasses ?? 0} icon={BookOpen} color="bg-emerald-50 text-emerald-600" />
              <StatCard label="Provas ativas" value={stats?.activeExams ?? 0} icon={FileText} color="bg-amber-50 text-amber-600" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subject performance chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Desempenho por Disciplina
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subjectPerf && subjectPerf.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={subjectPerf.map(s => ({ name: s.subjectName.slice(0, 10), tentativas: s.totalAttempts, score: s.averageScore ?? 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="tentativas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  Nenhuma atividade registrada ainda
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick stats */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3 mb-3">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Resumo do mês</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Provas criadas</span>
                    <span className="font-semibold">{stats?.examsThisMonth ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxa de conclusão</span>
                    <span className="font-semibold">{Math.round((stats?.completionRate ?? 0) * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Média geral</span>
                    <span className="font-semibold">
                      {stats?.averageScore != null ? stats.averageScore.toFixed(1) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total de provas</span>
                    <span className="font-semibold">{stats?.totalExams ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent activity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Atividade recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activity && activity.length > 0 ? (
                  <div className="space-y-2.5">
                    {activity.slice(0, 5).map(a => (
                      <div key={a.id} className="flex items-start gap-2">
                        <CheckCircle className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                        <div>
                          <div className="text-xs text-foreground">{a.description}</div>
                          <div className="text-xs text-muted-foreground">{a.userName}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem atividade recente</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
