import { useState } from "react";
import { Link } from "wouter";
import { useRegisterTenant } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { School } from "lucide-react";

export default function RegisterPage() {
  const { login } = useAuth();
  const registerMutation = useRegisterTenant();
  const [form, setForm] = useState({ institutionName: "", adminName: "", email: "", password: "" });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.institutionName || !form.adminName || !form.email || !form.password) {
      toast.error("Preencha todos os campos"); return;
    }
    registerMutation.mutate({ data: { ...form, plan: "free" } as any }, {
      onSuccess: (data: any) => {
        login(data.token);
        toast.success("Instituição cadastrada com sucesso!");
      },
      onError: () => toast.error("Erro ao cadastrar. Verifique os dados."),
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <School className="w-4 h-4 text-primary-foreground" />
          </div>
           <span className="font-bold text-foreground">HomeWorkPRO</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1">Cadastrar instituição</h1>
        <p className="text-muted-foreground text-sm mb-8">Crie sua conta gratuitamente e comece em minutos</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da instituição</Label>
            <Input placeholder="Ex: Colégio Estadual São Paulo" value={form.institutionName} onChange={set("institutionName")} />
          </div>
          <div className="space-y-1.5">
            <Label>Seu nome</Label>
            <Input placeholder="Nome completo do administrador" value={form.adminName} onChange={set("adminName")} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" placeholder="admin@escola.com.br" value={form.email} onChange={set("email")} />
          </div>
          <div className="space-y-1.5">
            <Label>Senha</Label>
            <Input type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={set("password")} />
          </div>
          <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? "Criando conta..." : "Criar conta gratuita"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
