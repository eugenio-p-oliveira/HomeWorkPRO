import { useState, useEffect } from "react";
import { useGetCurrentTenant, useUpdateCurrentTenant } from "@workspace/api-client-react";
import { getGetCurrentTenantQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings, Building2, Palette, GraduationCap, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { educationalLevelLabel } from "@/lib/utils";

const ALL_LEVELS = ["infantil","fundamental","medio","tecnico","superior"] as const;
const PLAN_LABELS: Record<string, string> = { free: "Gratuito", basic: "Basico", premium: "Premium" };
const PLAN_COLORS: Record<string, string> = { free: "bg-gray-100 text-gray-700", basic: "bg-blue-100 text-blue-700", premium: "bg-amber-100 text-amber-700" };

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: tenant, isLoading } = useGetCurrentTenant();
  const updateMutation = useUpdateCurrentTenant();

  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [levels, setLevels] = useState<string[]>([]);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setPrimaryColor(tenant.primaryColor ?? "#1e3a5f");
      setLevels(tenant.educationalLevels ?? []);
    }
  }, [tenant]);

  const toggleLevel = (l: string) => setLevels(ls => ls.includes(l) ? ls.filter(x => x !== l) : [...ls, l]);

  const handleSave = () => {
    updateMutation.mutate({ data: { name, primaryColor, educationalLevels: levels } }, {
      onSuccess: () => { toast.success("Configuracoes salvas!"); qc.invalidateQueries({ queryKey: getGetCurrentTenantQueryKey() }); },
      onError: () => toast.error("Erro ao salvar"),
    });
  };

  if (isLoading) return <Layout><div className="p-8 text-muted-foreground">Carregando...</div></Layout>;

  return (
    <Layout>
      <div className="p-8 max-w-2xl">
        <PageHeader title="Configuracoes" description="Personalize sua instituicao" />

        <div className="space-y-6">
          {/* Institution info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" />Dados da Instituicao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome da instituicao</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Plano atual</Label>
                  <div className="mt-1">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${PLAN_COLORS[tenant?.plan ?? "free"]}`}>
                      {PLAN_LABELS[tenant?.plan ?? "free"]}
                    </span>
                  </div>
                </div>
                {tenant?.plan !== "premium" && (
                  <a
                    href="mailto:eugenio.p.oliveira@outlook.com?subject=Interesse%20em%20upgrade%20do%20HomeWorkPRO"
                    className="inline-flex"
                  >
                    <Button variant="outline" size="sm">Falar sobre upgrade</Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Visual */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Palette className="w-4 h-4 text-primary" />Identidade Visual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Cor principal</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border" />
                  <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-32 font-mono text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Educational levels */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" />Niveis de Ensino</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ALL_LEVELS.map(l => (
                  <button key={l} type="button" onClick={() => toggleLevel(l)} className="flex items-center gap-2.5 w-full py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
                    {levels.includes(l) ? <CheckSquare className="w-4 h-4 text-primary shrink-0" /> : <Square className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <span className="text-sm">{educationalLevelLabel(l)}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full">
            {updateMutation.isPending ? "Salvando..." : "Salvar configuracoes"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
