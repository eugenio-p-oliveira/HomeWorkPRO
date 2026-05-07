import { useState } from "react";
import { Link } from "wouter";
import { useListExams, useCreateExam, useDeleteExam, usePublishExam, useListClasses, useListSubjects } from "@workspace/api-client-react";
import { getListExamsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Eye, Send, Clock, FileText, Filter } from "lucide-react";
import { toast } from "sonner";
import { examTypeLabel, examStatusLabel, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-orange-50 text-orange-700 border-orange-200",
};

const typeColors: Record<string, string> = {
  enem: "bg-purple-50 text-purple-700 border-purple-200",
  simulado: "bg-blue-50 text-blue-700 border-blue-200",
  traditional: "bg-gray-50 text-gray-700 border-gray-200",
  homework: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function ExamsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", type: "traditional", timeLimitMinutes: "", startsAt: "", endsAt: "",
    classId: "", subjectId: "", isPublic: false, showResultImmediately: true,
  });

  const params = {
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    type: typeFilter !== "all" ? typeFilter as any : undefined,
  };
  const { data: exams, isLoading } = useListExams(params);
  const { data: classes } = useListClasses({});
  const { data: subjects } = useListSubjects();
  const createMutation = useCreateExam();
  const deleteMutation = useDeleteExam();
  const publishMutation = usePublishExam();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListExamsQueryKey() });

  const handleCreate = () => {
    if (!form.title || !form.type) { toast.error("Título obrigatório"); return; }
    createMutation.mutate({
      data: {
        title: form.title, type: form.type as any,
        timeLimitMinutes: form.timeLimitMinutes ? parseInt(form.timeLimitMinutes) : null,
        startsAt: form.startsAt || null, endsAt: form.endsAt || null,
        classId: form.classId ? parseInt(form.classId) : null,
        subjectId: form.subjectId ? parseInt(form.subjectId) : null,
        isPublic: form.isPublic, showResultImmediately: form.showResultImmediately,
      } as any
    }, {
      onSuccess: (data: any) => {
        toast.success("Prova criada!");
        setDialogOpen(false);
        invalidate();
      },
      onError: () => toast.error("Erro ao criar prova"),
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Excluir prova?")) return;
    deleteMutation.mutate({ examId: id }, { onSuccess: () => { toast.success("Excluída"); invalidate(); }, onError: () => toast.error("Erro") });
  };

  const handlePublish = (id: number) => {
    publishMutation.mutate({ examId: id }, { onSuccess: () => { toast.success("Prova publicada!"); invalidate(); }, onError: () => toast.error("Erro ao publicar") });
  };

  return (
    <Layout>
      <div className="p-8">
        <PageHeader
          title="Provas"
          description="Crie e gerencie avaliações"
          action={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Nova prova</Button>}
        />

        <div className="flex items-center gap-3 mb-5">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Todos os status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {["draft","scheduled","active","closed"].map(s => <SelectItem key={s} value={s}>{examStatusLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {["enem","simulado","traditional","homework"].map(t => <SelectItem key={t} value={t}>{examTypeLabel(t)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Questoes</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !exams?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nenhuma prova criada ainda
                </TableCell></TableRow>
              ) : exams.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium text-sm">{e.title}</TableCell>
                  <TableCell><span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", typeColors[e.type] ?? "")}>{examTypeLabel(e.type)}</span></TableCell>
                  <TableCell><span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", statusColors[e.status] ?? "")}>{examStatusLabel(e.status)}</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.questionsCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.startsAt ? formatDateTime(e.startsAt) : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Link href={`/exams/${e.id}`}><Button variant="ghost" size="icon" className="w-7 h-7"><Eye className="w-3.5 h-3.5" /></Button></Link>
                      {e.status === "draft" && (
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-primary" onClick={() => handlePublish(e.id)}><Send className="w-3.5 h-3.5" /></Button>
                      )}
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nova prova</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5"><Label>Titulo da prova</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Prova de Matematica - 1º Bimestre" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["enem","simulado","traditional","homework"].map(t => <SelectItem key={t} value={t}>{examTypeLabel(t)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tempo limite (min)</Label>
                  <Input type="number" placeholder="Ex: 60" value={form.timeLimitMinutes} onChange={e => setForm(f => ({ ...f, timeLimitMinutes: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Inicio</Label><Input type="datetime-local" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Termino</Label><Input type="datetime-local" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Turma (opcional)</Label>
                  <Select value={form.classId || "_none"} onValueChange={v => setForm(f => ({ ...f, classId: v === "_none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Todas as turmas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Todas as turmas</SelectItem>
                      {classes?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Disciplina (opcional)</Label>
                  <Select value={form.subjectId || "_none"} onValueChange={v => setForm(f => ({ ...f, subjectId: v === "_none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Qualquer</SelectItem>
                      {subjects?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isPublic} onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))} className="rounded" />
                  <span className="text-sm">Prova publica</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.showResultImmediately} onChange={e => setForm(f => ({ ...f, showResultImmediately: e.target.checked }))} className="rounded" />
                  <span className="text-sm">Resultado imediato</span>
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Criando..." : "Criar prova"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
