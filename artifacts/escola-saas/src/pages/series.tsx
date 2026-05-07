import { useState } from "react";
import { useListSeries, useCreateSerie } from "@workspace/api-client-react";
import { getListSeriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Layers } from "lucide-react";
import { toast } from "sonner";
import { educationalLevelLabel } from "@/lib/utils";

const LEVELS = ["infantil","fundamental","medio","tecnico","superior"] as const;

export default function SeriesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", educationalLevel: "fundamental", order: "1" });

  const { data: series, isLoading } = useListSeries();
  const createMutation = useCreateSerie();

  const handleCreate = () => {
    if (!form.name || !form.educationalLevel) { toast.error("Preencha todos os campos"); return; }
    createMutation.mutate({ data: { name: form.name, educationalLevel: form.educationalLevel as any, order: parseInt(form.order) || 1 } }, {
      onSuccess: () => {
        toast.success("Serie criada!"); setDialogOpen(false);
        qc.invalidateQueries({ queryKey: getListSeriesQueryKey() });
        setForm({ name: "", educationalLevel: "fundamental", order: "1" });
      },
      onError: () => toast.error("Erro ao criar"),
    });
  };

  return (
    <Layout>
      <div className="p-8">
        <PageHeader
          title="Series"
          description="Configure a estrutura educacional da instituicao"
          action={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Nova serie</Button>}
        />

        {isLoading ? <div className="text-muted-foreground text-sm">Carregando...</div> : !series?.length ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div className="font-medium mb-1">Nenhuma serie cadastrada</div>
            <div className="text-sm mb-4">Ex: 1º ano Fundamental, 2º ano Medio</div>
            <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Nova serie</Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serie</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Ordem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {series.sort((a, b) => a.order - b.order).map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm">{s.name}</TableCell>
                    <TableCell><span className="text-xs px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 font-medium">{educationalLevelLabel(s.educationalLevel)}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.order}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Nova serie</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5"><Label>Nome</Label><Input placeholder="Ex: 1º ano, 2º ano" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>Nivel de ensino</Label>
                <Select value={form.educationalLevel} onValueChange={v => setForm(f => ({ ...f, educationalLevel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{educationalLevelLabel(l)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Ordem</Label><Input type="number" min="1" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} /></div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? "Criando..." : "Criar"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
