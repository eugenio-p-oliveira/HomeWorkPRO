import { useGuardianAuth } from "@/lib/guardian-auth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/Layout";
import { LogOut, MessageSquare, Bell, BookOpen, Calendar, TrendingUp, Users, Mail, AlertTriangle, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { API_URL } from "@/lib/api-url";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export default function GuardianDashboardPage() {
  const { guardian, logout, token } = useGuardianAuth();
  const [stats, setStats] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [tips, setTips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const api = (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(`${API_URL}/api${path}`, { ...init, headers });
  };

  useEffect(() => {
    if (!guardian || !token) return;
    const gid = guardian.id;
    async function load() {
      setLoading(true);
      try {
        const [statsRes, msgRes, evRes, tipsRes] = await Promise.all([
          api(`/guardians/${gid}/stats`),
          api(`/guardians/${gid}/messages`),
          api(`/guardians/events`),
          api(`/guardians/tips`),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (msgRes.ok) setMessages(await msgRes.json());
        if (evRes.ok) setEvents(await evRes.json());
        if (tipsRes.ok) setTips(await tipsRes.json());
      } catch (e) {
        toast.error("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [guardian, token]);

  const handleLogout = () => {
    logout();
    toast.success("Sessão encerrada");
  };

  const handleMarkRead = async (msgId: number) => {
    const res = await api(`/guardians/${guardian!.id}/messages/${msgId}/read`, { method: "PATCH" });
    if (res.ok) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isRead: true } : m));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando portal...</div>
      </div>
    );
  }

  const unread = messages.filter(m => !m.isRead).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">Portal de Responsáveis</h1>
              <p className="text-xs text-muted-foreground">{guardian?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <Badge variant="destructive" className="gap-1">
                <Bell className="w-3 h-3" /> {unread} não lida{unread > 1 ? "s" : ""}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
            <TabsTrigger value="events">Calendário</TabsTrigger>
            <TabsTrigger value="tips">Dicas</TabsTrigger>
          </TabsList>

          {/* ─── OVERVIEW ─── */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={BookOpen} label="Provas realizadas" value={stats?.totalExamsTaken ?? 0} />
              <StatCard icon={TrendingUp} label="Média geral" value={stats?.averagePercentage ? `${stats.averagePercentage.toFixed(1)}%` : "—"} />
              <StatCard icon={AlertTriangle} label="Mensagens não lidas" value={unread} />
              <StatCard icon={Calendar} label="Eventos próximos" value={events.filter(e => new Date(e.startsAt) > new Date()).length} />
            </div>

            {/* byStudent */}
            {stats?.byStudent && stats.byStudent.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Desempenho por Aluno</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.byStudent.map((s: any) => (
                    <Card key={s.studentId}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">{s.studentName}</h3>
                            <p className="text-sm text-muted-foreground">{s.totalExams} provas</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{s.averagePercentage?.toFixed(1) ?? "—"}%</div>
                            <div className="text-xs text-muted-foreground">aproveitamento</div>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.min(s.averagePercentage ?? 0, 100)}%` }} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* bySubject Radar */}
            {stats?.bySubject && stats.bySubject.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Desempenho por Disciplina</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={stats.bySubject.map((s: any) => ({ subject: s.subjectName, pct: Math.round(s.averagePercentage ?? 0) }))}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} />
                          <Radar name="Aproveitamento" dataKey="pct" stroke="#1a4b8c" fill="#1a4b8c" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                  <div className="space-y-3">
                    {stats.bySubject.map((s: any) => (
                      <div key={s.subjectId} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color ?? "#1a4b8c" }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium truncate">{s.subjectName}</span>
                            <span className="text-muted-foreground">{s.averagePercentage?.toFixed(1) ?? "—"}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(s.averagePercentage ?? 0, 100)}%`, backgroundColor: s.color ?? "#1a4b8c" }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent sessions */}
            {stats?.recentSessions && stats.recentSessions.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Provas Recentes</h2>
                <div className="space-y-2">
                  {stats.recentSessions.map((s: any) => (
                    <div key={s.sessionId} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {s.percentage?.toFixed(0) ?? "—"}%
                        </div>
                        <div>
                          <div className="font-medium text-sm">{s.examTitle}</div>
                          <div className="text-xs text-muted-foreground">{s.submittedAt ? formatDate(s.submittedAt) : "—"}</div>
                        </div>
                      </div>
                      <Badge variant={s.percentage >= 70 ? "default" : s.percentage >= 50 ? "outline" : "destructive"}>
                        {s.percentage >= 70 ? "Bom" : s.percentage >= 50 ? "Regular" : "Abaixo"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ─── MESSAGES ─── */}
          <TabsContent value="messages" className="space-y-4">
            <PageHeader title="Mensagens" description="Comunicados da escola sobre seu filho" />
            {messages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">Nenhuma mensagem</div>
            )}
            <div className="space-y-3">
              {messages.map(m => (
                <Card key={m.id} className={m.isRead ? "" : "border-l-4 border-l-primary"}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={m.isRead ? "outline" : "default"} className="text-xs">
                          {m.isRead ? "Lida" : "Não lida"}
                        </Badge>
                        <span className="text-sm font-medium">{m.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{m.createdAt ? formatDate(m.createdAt) : ""}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Enviada por: {m.senderName}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm">{m.body}</p>
                    {!m.isRead && (
                      <Button variant="ghost" size="sm" className="mt-2" onClick={() => handleMarkRead(m.id)}>
                        <Mail className="w-3 h-3 mr-1" /> Marcar como lida
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ─── EVENTS ─── */}
          <TabsContent value="events" className="space-y-4">
            <PageHeader title="Calendário Escolar" description="Próximos eventos e compromissos" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map(e => (
                <Card key={e.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={eventVariant(e.eventType)} className="text-xs capitalize">
                        {eventLabel(e.eventType)}
                      </Badge>
                    </div>
                    <CardTitle className="text-base mt-1">{e.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-2">{e.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{e.startsAt ? formatDate(e.startsAt) : ""} {e.isAllDay ? "(dia todo)" : ""}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ─── TIPS ─── */}
          <TabsContent value="tips" className="space-y-4">
            <PageHeader title="Dicas Pedagógicas" description="Como apoiar o aprendizado do seu filho" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tips.map(t => (
                <Card key={t.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      <CardTitle className="text-base">{t.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">{t.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function eventVariant(type: string) {
  const map: Record<string, any> = { exam: "default", holiday: "secondary", parent_meeting: "outline", cultural: "default", sports: "secondary", deadline: "destructive", other: "outline" };
  return map[type] ?? "outline";
}

function eventLabel(type: string) {
  const map: Record<string, string> = { exam: "Prova", holiday: "Feriado", parent_meeting: "Reunião", cultural: "Cultural", sports: "Esportes", deadline: "Prazo", other: "Outro" };
  return map[type] ?? type;
}
