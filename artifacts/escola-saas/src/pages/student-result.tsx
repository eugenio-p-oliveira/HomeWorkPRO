import { useParams, Link } from "wouter";
import { useGetSessionResult } from "@workspace/api-client-react";
import { getGetSessionResultQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Clock, Target, ArrowLeft, Trophy, AlertCircle } from "lucide-react";
import { getScoreColor, getScoreBg, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function StudentResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sId = parseInt(sessionId ?? "0");
  const { data: result, isLoading } = useGetSessionResult(sId, { query: { enabled: !!sId, queryKey: getGetSessionResultQueryKey(sId) } });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground">Carregando resultado...</div>
    </div>
  );

  if (!result) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <div className="font-semibold">Resultado nao disponivel</div>
        <Link href="/student"><Button variant="outline" className="mt-4">Voltar</Button></Link>
      </div>
    </div>
  );

  const pct = result.percentage;
  const passed = pct >= 60;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/student">
          <Button variant="ghost" size="sm" className="mb-6"><ArrowLeft className="w-4 h-4 mr-1.5" />Voltar para minhas provas</Button>
        </Link>

        {/* Score card */}
        <Card className={cn("mb-6 border-2", passed ? "border-emerald-300" : "border-red-200")}>
          <CardContent className="pt-8 pb-8 text-center">
            <div className={cn("w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center",
              passed ? "bg-emerald-100" : "bg-red-100"
            )}>
              {passed
                ? <Trophy className="w-10 h-10 text-emerald-600" />
                : <Target className="w-10 h-10 text-red-500" />
              }
            </div>
            <div className={cn("text-5xl font-bold mb-2", getScoreColor(pct))}>{pct.toFixed(0)}%</div>
            <div className="text-lg font-semibold text-foreground mb-1">
              {result.score.toFixed(1)} / {result.maxScore.toFixed(1)} pontos
            </div>
            <div className="text-sm text-muted-foreground">
              {result.correctAnswers} de {result.totalQuestions} questoes corretas
            </div>
            <Progress value={pct} className="mt-4 h-3" />
            <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div>
                <div className="text-2xl font-bold text-emerald-600">{result.correctAnswers}</div>
                <div className="text-xs text-muted-foreground">Acertos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{result.totalQuestions - result.correctAnswers}</div>
                <div className="text-xs text-muted-foreground">Erros</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground">
                  {result.timeSpentMinutes != null ? `${Math.round(result.timeSpentMinutes)}min` : "—"}
                </div>
                <div className="text-xs text-muted-foreground">Tempo</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question by question breakdown */}
        {result.questionResults && result.questionResults.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Gabarito detalhado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.questionResults.map((qr, i) => (
                  <div key={qr.questionId} className={cn("p-3.5 rounded-lg border", qr.isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")}>
                    <div className="flex items-center gap-2 mb-1">
                      {qr.isCorrect
                        ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        : <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      }
                      <span className="text-sm font-medium">Questao {i + 1}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {qr.isCorrect ? `+${qr.points.toFixed(1)}pt` : "0pt"}
                      </span>
                    </div>
                    {qr.explanation && (
                      <div className="mt-2 text-xs text-foreground/80 pl-6">{qr.explanation}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
