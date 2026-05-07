import { useState } from "react";
import { Link } from "wouter";
import {
  useListClasses, useListSeries, useCreateClass, useDeleteClass,
  useGetClassStats, useGetClass
} from "@workspace/api-client-react";
import { getListClassesQueryKey, getGetClassQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Eye, Users, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { shiftLabel } from "@/lib/utils";

const SHIFTS = ["manha", "tarde", "noite", "integral"] as const;

export default function ClassesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ serieId: "", name: "", shift: "manha", year: new Date().getFullYear().toString() });

  const { data: classes, isLoading } = useListClasses({});
  const { data: series } = useListSeries();
  const createMutation = useCreateClass();
  const deleteMutation = useDeleteClass();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListClassesQueryKey({}) });

  const handleCreate = () => {
    if (!form.serieId || !form.name || !form.shift || !form.year) { toast.error("Preencha todos os campos"); return; }
    createMutation.mutate({
      data: { serieId: parseInt(form.serieId), name: form.name, shift: form.shift as any, year: parseInt(form.year) }
    }, {
      onSuccess: () => { toast.success("Turma criada!"); setDialogOpen(false); invalidate(); form.name = ""; },
      onError: () => toast.error("Erro ao criar turma"),
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Excluir turma?")) return;
    deleteMutation.mutate({ classId: id }, { onSuccess: () => { toast.success("Excluida"); invalidate(); }, onError: () => toast.error("Erro") });
  };

  return (
    <Layout>
      <div className="p-8">
        <PageHeader
          title="Turmas"
          description="Organize alunos em turmas por serie e turno"
          action={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Nova turma</Button>}
        />

        {isLoading ? (
          <div className="text-muted-foreground text-sm">Carregando...</div>
        ) : !classes?.length ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div className="font-medium mb-1">Nenhuma turma cadastrada</div>
            <div className="text-sm mb-4">Crie a primeira turma para comecar</div>
            <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Nova turma</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {classes.map(c => {
              const serie = series?.find(s => s.id === c.serieId);
              return (
                <Card key={c.id} className="hover:border-primary/40 transition-colors">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-foreground">{c.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {serie?.name ?? "Serie"} · {shiftLabel(c.shift)}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/classes/${c.id}`}><Button variant="ghost" size="icon" className="w-7 h-7"><Eye className="w-3.5 h-3.5" /></Button></Link>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>{c.studentsCount} alunos</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{c.year}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova turma</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5"><Label>Nome da turma</Label><Input placeholder="Ex: 1ºA, 2ºB" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>Serie</Label>
                <Select value={form.serieId} onValueChange={v => setForm(f => ({ ...f, serieId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a serie" /></SelectTrigger>
                  <SelectContent>{series?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Turno</Label>
                  <Select value={form.shift} onValueChange={v => setForm(f => ({ ...f, shift: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SHIFTS.map(s => <SelectItem key={s} value={s}>{shiftLabel(s)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Ano letivo</Label><Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? "Criando..." : "Criar turma"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
