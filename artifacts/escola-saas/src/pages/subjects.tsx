import { useState } from "react";
import { useListSubjects, useCreateSubject, useDeleteSubject, useListTopics, useCreateTopic, useDeleteTopic } from "@workspace/api-client-react";
import { getListSubjectsQueryKey, getListTopicsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useState as useLocalState } from "react";

const COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#f97316","#84cc16"];

export default function SubjectsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", color: COLORS[0] });
  const [topicForm, setTopicForm] = useState({ name: "", description: "" });

  const { data: subjects, isLoading } = useListSubjects();
  const { data: topics } = useListTopics(selectedSubject ? { subjectId: selectedSubject.id } : {});
  const { data: allTopics } = useListTopics({});
  const createSubjectMutation = useCreateSubject();
  const deleteSubjectMutation = useDeleteSubject();
  const createTopicMutation = useCreateTopic();
  const deleteTopicMutation = useDeleteTopic();

  const invalidateSubjects = () => qc.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
  const invalidateTopics = () => qc.invalidateQueries({ queryKey: getListTopicsQueryKey({}) });

  const handleCreateSubject = () => {
    if (!form.name) { toast.error("Nome obrigatorio"); return; }
    createSubjectMutation.mutate({ data: { name: form.name, color: form.color } }, {
      onSuccess: () => { toast.success("Disciplina criada!"); setDialogOpen(false); invalidateSubjects(); setForm({ name: "", color: COLORS[0] }); },
      onError: () => toast.error("Erro ao criar"),
    });
  };

  const handleDeleteSubject = (id: number) => {
    if (!confirm("Excluir disciplina e todos os topicos?")) return;
    deleteSubjectMutation.mutate({ subjectId: id }, { onSuccess: () => { toast.success("Excluida"); invalidateSubjects(); invalidateTopics(); }, onError: () => toast.error("Erro") });
  };

  const handleCreateTopic = () => {
    if (!topicForm.name || !selectedSubject) { toast.error("Nome obrigatorio"); return; }
    createTopicMutation.mutate({ data: { subjectId: selectedSubject.id, name: topicForm.name, description: topicForm.description || null } }, {
      onSuccess: () => { toast.success("Topico criado!"); setTopicDialogOpen(false); invalidateSubjects(); invalidateTopics(); setTopicForm({ name: "", description: "" }); },
      onError: () => toast.error("Erro ao criar"),
    });
  };

  const openAddTopic = (s: any) => { setSelectedSubject(s); setTopicForm({ name: "", description: "" }); setTopicDialogOpen(true); };

  return (
    <Layout>
      <div className="p-8">
        <PageHeader
          title="Disciplinas"
          description="Gerencie materias e conteudos programaticos"
          action={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Nova disciplina</Button>}
        />

        {isLoading ? <div className="text-muted-foreground text-sm">Carregando...</div> : !subjects?.length ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div className="font-medium mb-1">Nenhuma disciplina cadastrada</div>
            <Button size="sm" className="mt-3" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Nova disciplina</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {subjects.map(s => {
              const subjectTopics = allTopics?.filter(t => t.subjectId === s.id) ?? [];
              const expanded = expandedId === s.id;
              return (
                <Card key={s.id}>
                  <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : s.id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color ?? "#3b82f6" }} />
                      <span className="font-semibold text-sm flex-1">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.topicsCount} topicos</span>
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={e => { e.stopPropagation(); openAddTopic(s); }}><Plus className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); handleDeleteSubject(s.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                      {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </CardHeader>
                  {expanded && subjectTopics.length > 0 && (
                    <CardContent className="pt-0 pb-3 px-4">
                      <div className="border-t pt-3 space-y-1.5">
                        {subjectTopics.map(t => (
                          <div key={t.id} className="flex items-center gap-2 text-sm py-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                            <span className="flex-1">{t.name}</span>
                            {t.description && <span className="text-xs text-muted-foreground">{t.description}</span>}
                            <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive hover:text-destructive" onClick={() => {
                              deleteTopicMutation.mutate({ topicId: t.id }, { onSuccess: () => { invalidateSubjects(); invalidateTopics(); }, onError: () => toast.error("Erro") });
                            }}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Nova disciplina</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5"><Label>Nome</Label><Input placeholder="Ex: Matematica" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>Cor</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleCreateSubject} disabled={createSubjectMutation.isPending}>{createSubjectMutation.isPending ? "Criando..." : "Criar"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Novo topico em {selectedSubject?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5"><Label>Nome do topico</Label><Input placeholder="Ex: Algebra Linear" value={topicForm.name} onChange={e => setTopicForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Descricao (opcional)</Label><Input placeholder="Breve descricao do conteudo" value={topicForm.description} onChange={e => setTopicForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setTopicDialogOpen(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleCreateTopic} disabled={createTopicMutation.isPending}>{createTopicMutation.isPending ? "Criando..." : "Criar topico"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
