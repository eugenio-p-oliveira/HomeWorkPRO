import { useParams, Link } from "wouter";
import { useGetUserStats, useGetUser } from "@workspace/api-client-react";
import { getGetUserStatsQueryKey, getGetUserQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, TrendingUp, Trophy, BarChart3, BookOpen, Calendar } from "lucide-react";
import { getScoreColor, getScoreBg, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const userId = parseInt(id ?? "0");

  const { data: user, isLoading: userLoading } = useGetUser(userId, {
    query: { enabled: !!userId, queryKey: getGetUserQueryKey(userId) },
  });
  const { data: stats, isLoading: statsLoading } = useGetUserStats(userId, {
    query: { enabled: !!userId, queryKey: getGetUserStatsQueryKey(userId) },
  });

  if (userLoading || statsLoading) {
    return <Layout><div className="p-8 text-muted-foreground">Carregando...</div></Layout>;
  }
  if (!user) {
    return <Layout><div className="p-8 text-muted-foreground">Aluno nao encontrado</div></Layout>;
  }

  const initials = user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const total = stats?.totalExamsTaken ?? 0;
  const avgPct = stats?.averagePercentage ?? 0;
  const bestScore = stats?.bestScore ?? 0;
  const bySubject = stats?.bySubject ?? [];
  const timeline = stats?.timeline ?? [];
  const recentSessions = stats?.recentSessions ?? [];

  // Radar chart data
  const radarData = bySubject.map(s => ({
    subject: s.subjectName.slice(0, 12),
    score: Math.round((s.averagePercentage ?? 0)),
    fullMark: 100,
  }));

  // Timeline chart data
  const timelineData = timeline.map((t, i) => ({
    name: `P${i + 1}`,
    percentage: Math.round(t.percentage),
    date: new Date(t.submittedAt ?? new Date()).toLocaleDateString("pt-BR"),
  }));

  return (
    <Layout>
      <div className="p-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/classes"><Button variant="ghost" size="icon" className="w-8 h-8"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">{user.name}</h1>
              <p className="text-sm text-muted-foreground">{user.email} · {user.registrationNumber ?? "Sem matrícula"}</p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Provas realizadas</div>
                  <div className="text-2xl font-bold">{total}</div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><BookOpen className="w-4.5 h-4.5 text-blue-600" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Media geral</div>
                  <div className="text-2xl font-bold">{avgPct.toFixed(1)}%</div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center"><TrendingUp className="w-4.5 h-4.5 text-purple-600" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Melhor nota</div>
                  <div className="text-2xl font-bold">{bestScore}</div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><Trophy className="w-4.5 h-4.5 text-amber-600" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Disciplinas</div>
                  <div className="text-2xl font-bold">{bySubject.length}</div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><BarChart3 className="w-4.5 h-4.5 text-emerald-600" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Radar / Subject */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Desempenho por Disciplina</CardTitle>
            </CardHeader>
            <CardContent>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Aluno" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                    <Tooltip formatter={(v: any) => [`${v}%`, "Média"]} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados por disciplina</div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />Evolução das Notas</CardTitle>
            </CardHeader>
            <CardContent>
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v: any) => [`${v}%`, "Aproveitamento"]} />
                    <Line type="monotone" dataKey="percentage" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem histórico de notas</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subject detail list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {bySubject.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />Detalhamento por Disciplina</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bySubject.map(s => {
                    const pct = s.averagePercentage ?? 0;
                    return (
                      <div key={s.subjectId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{s.subjectName}</span>
                          <span className={cn("text-xs font-semibold", getScoreColor(pct))}>{pct.toFixed(1)}% <span className="text-muted-foreground">({s.totalAttempts} provas)</span></span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent sessions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />Provas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentSessions.length > 0 ? (
                <div className="space-y-2">
                  {[...recentSessions].reverse().map((s, i) => (
                    <div key={s.sessionId} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <span className="text-xs font-medium text-muted-foreground w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{s.examTitle}</div>
                        <div className="text-xs text-muted-foreground">{s.submittedAt ? formatDateTime(s.submittedAt) : "—"}</div>
                      </div>
                      <span className={cn("text-sm font-semibold shrink-0", getScoreColor(s.percentage ?? 0))}>
                        {s.score !== null ? s.score : "—"} <span className="text-xs text-muted-foreground">({(s.percentage ?? 0).toFixed(0)}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-8">Nenhuma prova realizada ainda</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
