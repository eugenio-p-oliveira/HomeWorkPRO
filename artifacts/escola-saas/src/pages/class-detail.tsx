import { useParams, Link } from "wouter";
import { useGetClass, useGetClassStats, useAddStudentToClass, useListUsers } from "@workspace/api-client-react";
import { getGetClassQueryKey, getGetClassStatsQueryKey, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Users, TrendingUp, Trophy, Plus } from "lucide-react";
import { shiftLabel, getScoreColor, getScoreBg } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const classId = parseInt(id ?? "0");
  const qc = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState("");

  const { data: cls, isLoading } = useGetClass(classId, { query: { enabled: !!classId, queryKey: getGetClassQueryKey(classId) } });
  const { data: stats } = useGetClassStats(classId, { query: { enabled: !!classId, queryKey: getGetClassStatsQueryKey(classId) } });
  const { data: allStudents } = useListUsers({ role: "student" as any });
  const addMutation = useAddStudentToClass();

  const enrolledIds = new Set(cls?.students?.map(s => s.id) ?? []);
  const availableStudents = allStudents?.filter(s => !enrolledIds.has(s.id)) ?? [];

  const handleAddStudent = () => {
    if (!selectedStudent) return;
    addMutation.mutate({ classId, data: { studentId: parseInt(selectedStudent) } }, {
      onSuccess: () => {
        toast.success("Aluno adicionado");
        setSelectedStudent("");
        qc.invalidateQueries({ queryKey: getGetClassQueryKey(classId) });
        qc.invalidateQueries({ queryKey: getGetClassStatsQueryKey(classId) });
      },
      onError: () => toast.error("Erro ao adicionar aluno"),
    });
  };

  if (isLoading) return <Layout><div className="p-8 text-muted-foreground">Carregando...</div></Layout>;
  if (!cls) return <Layout><div className="p-8 text-muted-foreground">Turma nao encontrada</div></Layout>;

  return (
    <Layout>
      <div className="p-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/classes"><Button variant="ghost" size="icon" className="w-8 h-8"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-xl font-bold">{cls.name}</h1>
            <p className="text-sm text-muted-foreground">{cls.serie?.name} · {shiftLabel(cls.shift)} · {cls.year}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Students */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Alunos ({cls.students?.length ?? 0})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Adicionar aluno..." /></SelectTrigger>
                      <SelectContent>{availableStudents.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" className="h-8 px-3" onClick={handleAddStudent} disabled={!selectedStudent || addMutation.isPending}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!cls.students?.length ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Nenhum aluno matriculado ainda</div>
                ) : (
                  <div className="space-y-2">
                    {cls.students.map(s => (
                      <div key={s.id} className="flex items-center gap-3 py-1.5">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                            {s.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </div>
                        {s.registrationNumber && <span className="text-xs text-muted-foreground">{s.registrationNumber}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Desempenho</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Media geral</span><span className="font-semibold">{stats?.averageScore != null ? stats.averageScore.toFixed(1) : "—"}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxa de conclusao</span><span className="font-semibold">{Math.round((stats?.completionRate ?? 0) * 100)}%</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Provas realizadas</span><span className="font-semibold">{stats?.examsTaken ?? 0}</span></div>
              </CardContent>
            </Card>

            {stats?.ranking && stats.ranking.length > 0 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" />Ranking</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.ranking.slice(0, 5).map(r => (
                      <div key={r.userId} className="flex items-center gap-2">
                        <span className={cn("w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center",
                          r.rank === 1 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                        )}>{r.rank}</span>
                        <span className="flex-1 text-sm truncate">{r.name}</span>
                        <span className={cn("text-xs font-semibold", getScoreColor(r.percentage))}>{r.percentage.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
