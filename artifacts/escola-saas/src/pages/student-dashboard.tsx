import { Link } from "wouter";
import { useListStudentExams, useGetUserStats, useGetMe } from "@workspace/api-client-react";
import { getGetUserStatsQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { Clock, CheckCircle, BookOpen, TrendingUp, Play, Eye, Calendar } from "lucide-react";
import { examTypeLabel, examStatusLabel, formatDateTime, getScoreColor, getScoreBg } from "@/lib/utils";
import { cn } from "@/lib/utils";

const examTypeBg: Record<string, string> = {
  enem: "bg-purple-50 text-purple-700 border-purple-200",
  simulado: "bg-blue-50 text-blue-700 border-blue-200",
  traditional: "bg-gray-50 text-gray-700 border-gray-200",
  homework: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { data: examData, isLoading } = useListStudentExams();
  const { data: stats } = useGetUserStats(user?.id ?? 0, { query: { enabled: !!user?.id, queryKey: getGetUserStatsQueryKey(user?.id ?? 0) } });

  return (
    <Layout>
      <div className="p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Ola, {user?.name?.split(" ")[0]}!</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Acompanhe suas avaliacoes e desempenho</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><BookOpen className="w-4.5 h-4.5 text-blue-600" /></div>
                <div>
                  <div className="text-xs text-muted-foreground">Provas realizadas</div>
                  <div className="text-2xl font-bold">{stats?.totalExamsTaken ?? 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><TrendingUp className="w-4.5 h-4.5 text-emerald-600" /></div>
                <div>
                  <div className="text-xs text-muted-foreground">Media geral</div>
                  <div className="text-2xl font-bold">{stats?.averageScore != null ? stats.averageScore.toFixed(1) : "—"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center"><CheckCircle className="w-4.5 h-4.5 text-purple-600" /></div>
                <div>
                  <div className="text-xs text-muted-foreground">Melhor nota</div>
                  <div className="text-2xl font-bold">{stats?.bestScore != null ? stats.bestScore.toFixed(1) : "—"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available exams */}
        {examData?.available && examData.available.length > 0 && (
          <div className="mb-8">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" />Provas disponíveis
            </h2>
            <div className="space-y-3">
              {examData.available.map(e => (
                <Card key={e.id} className="border-primary/20">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{e.title}</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", examTypeBg[e.type] ?? "")}>{examTypeLabel(e.type)}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {e.timeLimitMinutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{e.timeLimitMinutes} min</span>}
                          {e.endsAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Ate {formatDateTime(e.endsAt)}</span>}
                          <span>{e.questionsCount} questoes</span>
                        </div>
                      </div>
                      <Link href={`/student/exam/${e.id}`}>
                        <Button size="sm" className="shrink-0"><Play className="w-3.5 h-3.5 mr-1.5" />Iniciar</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming exams */}
        {examData?.upcoming && examData.upcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />Provas agendadas
            </h2>
            <div className="space-y-2">
              {examData.upcoming.map(e => (
                <div key={e.id} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{e.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {e.startsAt ? `Inicia em ${formatDateTime(e.startsAt)}` : "Data a definir"}
                    </div>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", examTypeBg[e.type] ?? "")}>{examTypeLabel(e.type)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed exams */}
        {examData?.completed && examData.completed.length > 0 && (
          <div>
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />Historico de provas
            </h2>
            <div className="space-y-2">
              {examData.completed.map(s => (
                <div key={s.sessionId} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{s.examTitle}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {s.submittedAt ? formatDateTime(s.submittedAt) : "—"}
                    </div>
                  </div>
                  {s.percentage != null && (
                    <div className="text-right">
                      <div className={cn("font-bold text-sm", getScoreColor(s.percentage))}>
                        {s.percentage.toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">{s.score?.toFixed(1) ?? "—"} pts</div>
                    </div>
                  )}
                  <Link href={`/student/result/${s.sessionId}`}>
                    <Button variant="ghost" size="sm" className="text-xs"><Eye className="w-3 h-3 mr-1" />Ver</Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && !examData?.available?.length && !examData?.completed?.length && !examData?.upcoming?.length && (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div className="font-medium mb-1">Nenhuma prova disponivel</div>
            <div className="text-sm">Aguarde seu professor liberar uma avaliacao</div>
          </div>
        )}
      </div>
    </Layout>
  );
}
