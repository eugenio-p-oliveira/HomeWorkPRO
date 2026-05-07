import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetExam, useCreateQuestion, useDeleteQuestion, usePublishExam,
  useListTopics, useListSubjects, useUpdateExam
} from "@workspace/api-client-react";
import { getGetExamQueryKey, getListQuestionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Trash2, BarChart3, Send, ArrowLeft, CheckCircle,
  XCircle, Circle, ChevronDown, ChevronUp, Clock, FileText
} from "lucide-react";
import { toast } from "sonner";
import { examTypeLabel, examStatusLabel, cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D", "E"];

function QuestionCard({ q, onDelete }: { q: any; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <Card className="mb-3">
      <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{q.order}</span>
            <span className="text-sm font-medium text-foreground line-clamp-2">{q.statement}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground">{q.points}pt</span>
            <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 pb-3 px-4">
          <Separator className="mb-3" />
          <div className="space-y-1.5">
            {q.options.map((o: any) => (
              <div key={o.id} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm", o.isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-muted/50")}>
                {o.isCorrect ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                <span className="font-medium mr-1">{o.letter}.</span>
                {o.text}
              </div>
            ))}
          </div>
          {q.explanation && (
            <div className="mt-3 p-3 bg-blue-50 rounded-md text-xs text-blue-800">
              <strong>Explicacao:</strong> {q.explanation}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const examId = parseInt(id ?? "0");
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qType, setQType] = useState<"multiple_choice" | "true_false">("multiple_choice");
  const [statement, setStatement] = useState("");
  const [explanation, setExplanation] = useState("");
  const [points, setPoints] = useState("1");
  const [options, setOptions] = useState([
    { letter: "A", text: "", isCorrect: false },
    { letter: "B", text: "", isCorrect: false },
    { letter: "C", text: "", isCorrect: false },
    { letter: "D", text: "", isCorrect: false },
  ]);

  const { data: exam, isLoading } = useGetExam(examId, { query: { enabled: !!examId, queryKey: getGetExamQueryKey(examId) } });
  const createMutation = useCreateQuestion();
  const deleteMutation = useDeleteQuestion();
  const publishMutation = usePublishExam();

  const invalidate = () => { qc.invalidateQueries({ queryKey: getGetExamQueryKey(examId) }); };

  const resetDialog = () => {
    setStatement(""); setExplanation(""); setPoints("1"); setQType("multiple_choice");
    setOptions([
      { letter: "A", text: "", isCorrect: false },
      { letter: "B", text: "", isCorrect: false },
      { letter: "C", text: "", isCorrect: false },
      { letter: "D", text: "", isCorrect: false },
    ]);
  };

  const openDialog = () => { resetDialog(); setDialogOpen(true); };

  const handleTypeChange = (t: "multiple_choice" | "true_false") => {
    setQType(t);
    if (t === "true_false") {
      setOptions([{ letter: "V", text: "Verdadeiro", isCorrect: false }, { letter: "F", text: "Falso", isCorrect: false }]);
    } else {
      setOptions([
        { letter: "A", text: "", isCorrect: false }, { letter: "B", text: "", isCorrect: false },
        { letter: "C", text: "", isCorrect: false }, { letter: "D", text: "", isCorrect: false },
      ]);
    }
  };

  const setCorrect = (idx: number) => {
    setOptions(opts => opts.map((o, i) => ({ ...o, isCorrect: i === idx })));
  };

  const addOption = () => {
    if (options.length >= 5) return;
    setOptions(opts => [...opts, { letter: LETTERS[opts.length] ?? "E", text: "", isCorrect: false }]);
  };

  const handleSaveQuestion = () => {
    if (!statement.trim()) { toast.error("Enunciado obrigatorio"); return; }
    if (!options.some(o => o.isCorrect)) { toast.error("Marque a resposta correta"); return; }
    if (options.some(o => !o.text.trim())) { toast.error("Preencha todas as alternativas"); return; }
    const nextOrder = (exam?.questions?.length ?? 0) + 1;
    createMutation.mutate({
      examId,
      data: {
        type: qType, statement, explanation: explanation || null, topicId: null,
        points: parseFloat(points) || 1, order: nextOrder, options,
      } as any
    }, {
      onSuccess: () => { toast.success("Questao adicionada!"); setDialogOpen(false); invalidate(); },
      onError: () => toast.error("Erro ao adicionar questao"),
    });
  };

  const handleDelete = (qId: number) => {
    if (!confirm("Remover questao?")) return;
    deleteMutation.mutate({ questionId: qId }, { onSuccess: () => { toast.success("Removida"); invalidate(); }, onError: () => toast.error("Erro") });
  };

  const handlePublish = () => {
    if ((exam?.questionsCount ?? 0) === 0) { toast.error("Adicione questoes antes de publicar"); return; }
    publishMutation.mutate({ examId }, { onSuccess: () => { toast.success("Prova publicada!"); invalidate(); }, onError: () => toast.error("Erro ao publicar") });
  };

  if (isLoading) return <Layout><div className="p-8 text-muted-foreground">Carregando...</div></Layout>;
  if (!exam) return <Layout><div className="p-8 text-muted-foreground">Prova nao encontrada</div></Layout>;

  return (
    <Layout>
      <div className="p-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/exams"><Button variant="ghost" size="icon" className="w-8 h-8"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{exam.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 border-gray-200 font-medium">{examTypeLabel(exam.type)}</span>
              <span className="text-xs text-muted-foreground">{examStatusLabel(exam.status)}</span>
              {exam.timeLimitMinutes && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{exam.timeLimitMinutes} min</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {exam.questionsCount > 0 && (
              <Link href={`/exams/${examId}/report`}>
                <Button variant="outline" size="sm"><BarChart3 className="w-4 h-4 mr-1.5" />Relatorio</Button>
              </Link>
            )}
            {exam.status === "draft" && (
              <Button size="sm" onClick={handlePublish} disabled={publishMutation.isPending}>
                <Send className="w-4 h-4 mr-1.5" />Publicar
              </Button>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-foreground">{exam.questionsCount} {exam.questionsCount === 1 ? "questao" : "questoes"}</div>
          {exam.status === "draft" && (
            <Button size="sm" variant="outline" onClick={openDialog}><Plus className="w-4 h-4 mr-1.5" />Adicionar questao</Button>
          )}
        </div>

        {exam.questions?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div className="font-medium mb-1">Nenhuma questao ainda</div>
            <div className="text-sm mb-4">Adicione questoes para montar a prova</div>
            {exam.status === "draft" && <Button size="sm" onClick={openDialog}><Plus className="w-4 h-4 mr-1.5" />Adicionar questao</Button>}
          </div>
        ) : (
          exam.questions?.map((q: any) => (
            <QuestionCard key={q.id} q={q} onDelete={() => handleDelete(q.id)} />
          ))
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova questao</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={qType} onValueChange={v => handleTypeChange(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multipla escolha</SelectItem>
                      <SelectItem value="true_false">Verdadeiro ou Falso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Pontos</Label>
                  <Input type="number" min="0.5" step="0.5" value={points} onChange={e => setPoints(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Enunciado</Label>
                <Textarea rows={3} placeholder="Digite o enunciado da questao..." value={statement} onChange={e => setStatement(e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Alternativas</Label>
                  {qType === "multiple_choice" && options.length < 5 && (
                    <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={addOption}><Plus className="w-3 h-3 mr-1" />Adicionar</Button>
                  )}
                </div>
                <div className="space-y-2">
                  {options.map((o, i) => (
                    <div key={i} className={cn("flex items-center gap-2.5 p-2 rounded-md border", o.isCorrect ? "border-emerald-300 bg-emerald-50" : "border-border")}>
                      <button type="button" onClick={() => setCorrect(i)} className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors", o.isCorrect ? "border-emerald-500 bg-emerald-500" : "border-gray-300")}>
                        {o.isCorrect && <div className="w-2 h-2 rounded-full bg-white" />}
                      </button>
                      <span className="font-bold text-sm text-muted-foreground w-4 shrink-0">{o.letter}</span>
                      {qType === "true_false" ? (
                        <span className="text-sm">{o.text}</span>
                      ) : (
                        <Input className="flex-1 h-8 text-sm" placeholder={`Alternativa ${o.letter}`} value={o.text} onChange={e => setOptions(opts => opts.map((opt, j) => j === i ? { ...opt, text: e.target.value } : opt))} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Explicacao (opcional)</Label>
                <Textarea rows={2} placeholder="Explicacao que sera mostrada apos a prova..." value={explanation} onChange={e => setExplanation(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleSaveQuestion} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Salvar questao"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
