import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useStartExamSession, useSubmitAnswer, useSubmitExamSession } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Clock, AlertTriangle, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function useTimer(endsAt: string | null | undefined) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => { const secs = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000)); setRemaining(secs); };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);
  return remaining;
}

function formatTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function StudentExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const [, navigate] = useLocation();
  const [session, setSession] = useState<any>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  const startMutation = useStartExamSession();
  const answerMutation = useSubmitAnswer();
  const submitMutation = useSubmitExamSession();

  const remaining = useTimer(session?.endsAt);

  useEffect(() => {
    if (!examId) return;
    startMutation.mutate({ examId: parseInt(examId) }, {
      onSuccess: (data: any) => { setSession(data); setLoading(false); },
      onError: () => { toast.error("Nao foi possivel iniciar a prova"); setLoading(false); },
    });
  }, [examId]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (remaining === 0 && session && !submitted) {
      handleSubmit(true);
    }
  }, [remaining]);

  const handleSelectOption = (questionId: number, optionId: number) => {
    setAnswers(a => ({ ...a, [questionId]: optionId }));
    answerMutation.mutate({ sessionId: session.id, data: { questionId, selectedOptionId: optionId } });
  };

  const handleSubmit = useCallback((auto = false) => {
    if (!session) return;
    if (!auto && !confirm("Deseja finalizar a prova? Esta acao nao pode ser desfeita.")) return;
    setSubmitted(true);
    submitMutation.mutate({ sessionId: session.id }, {
      onSuccess: () => { toast.success("Prova enviada!"); navigate(`/student/result/${session.id}`); },
      onError: () => { toast.error("Erro ao enviar prova"); setSubmitted(false); },
    });
  }, [session, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="text-muted-foreground">Preparando sua prova...</div>
      </div>
    </div>
  );

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <div className="font-semibold">Prova indisponivel</div>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/student")}>Voltar</Button>
      </div>
    </div>
  );

  const questions = session.exam?.questions ?? [];
  const currentQ = questions[currentIdx];
  const totalAnswered = Object.keys(answers).length;
  const progress = questions.length > 0 ? (totalAnswered / questions.length) * 100 : 0;
  const isUrgent = remaining != null && remaining < 300;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <div className="font-bold text-sm text-foreground">{session.exam?.title}</div>
            <div className="text-xs text-muted-foreground">{questions.length} questoes</div>
          </div>
          <div className="flex items-center gap-6">
            {remaining != null && (
              <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-sm",
                isUrgent ? "bg-red-100 text-red-700 animate-pulse" : "bg-muted text-foreground"
              )}>
                <Clock className={cn("w-4 h-4", isUrgent ? "text-red-600" : "text-muted-foreground")} />
                {formatTime(remaining)}
              </div>
            )}
            <div className="text-xs text-muted-foreground">{totalAnswered}/{questions.length} respondidas</div>
            <Button size="sm" onClick={() => handleSubmit(false)} disabled={submitMutation.isPending || submitted}>
              <Send className="w-3.5 h-3.5 mr-1.5" />Finalizar
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Question navigator */}
        <div className="flex flex-wrap gap-2 mb-6">
          {questions.map((q: any, i: number) => {
            const answered = answers[q.id] !== undefined;
            return (
              <button key={q.id} onClick={() => setCurrentIdx(i)} className={cn(
                "w-8 h-8 rounded-md text-xs font-bold border-2 transition-colors",
                i === currentIdx ? "border-primary bg-primary text-primary-foreground" :
                answered ? "border-emerald-400 bg-emerald-50 text-emerald-700" :
                "border-border bg-background text-muted-foreground hover:border-primary/50"
              )}>{i + 1}</button>
            );
          })}
        </div>

        {/* Current question */}
        {currentQ && (
          <Card className="mb-6">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  {currentIdx + 1}
                </span>
                <span className="text-xs text-muted-foreground">{currentQ.points} {currentQ.points === 1 ? "ponto" : "pontos"}</span>
              </div>
              <p className="text-foreground font-medium mb-6 leading-relaxed">{currentQ.statement}</p>
              <div className="space-y-3">
                {currentQ.options?.map((o: any) => {
                  const selected = answers[currentQ.id] === o.id;
                  return (
                    <button key={o.id} onClick={() => handleSelectOption(currentQ.id, o.id)} className={cn(
                      "w-full flex items-center gap-3 p-3.5 rounded-lg border-2 text-left transition-all text-sm",
                      selected ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40 hover:bg-muted/30"
                    )}>
                      <div className={cn("w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                        selected ? "border-primary bg-primary" : "border-muted-foreground/40"
                      )}>
                        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="font-bold mr-1">{o.letter}.</span>
                      {o.text}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" />Anterior
          </Button>
          <span className="text-sm text-muted-foreground">{currentIdx + 1} de {questions.length}</span>
          {currentIdx < questions.length - 1 ? (
            <Button variant="outline" onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}>
              Proxima<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => handleSubmit(false)} disabled={submitMutation.isPending || submitted}>
              <Send className="w-4 h-4 mr-1.5" />Enviar prova
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
