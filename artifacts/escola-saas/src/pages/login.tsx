import { useState } from "react";
import { Link } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { School, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const loginMutation = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Preencha todos os campos"); return; }
    loginMutation.mutate({ data: { email, password } }, {
      onSuccess: (data: any) => {
        login(data.token);
        toast.success("Bem-vindo!");
      },
      onError: () => toast.error("E-mail ou senha incorretos"),
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-primary flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <School className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">HomeWorkPRO</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Plataforma completa para gestão escolar e avaliações
          </h2>
          <p className="text-primary-foreground/70 text-lg">
            Crie provas, analise desempenho e acompanhe o progresso de cada aluno com inteligência pedagógica.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[["Provas", "Criação e correção automática"], ["Relatórios", "Análise pedagógica detalhada"], ["Multi-tenant", "Para toda a instituição"]].map(([t, d]) => (
            <div key={t} className="bg-white/10 rounded-xl p-4">
              <div className="text-white font-semibold text-sm mb-1">{t}</div>
              <div className="text-primary-foreground/60 text-xs">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <School className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">EduSaaS</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">Entrar na plataforma</h1>
          <p className="text-muted-foreground text-sm mb-8">Use suas credenciais institucionais</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input id="password" type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPass(p => !p)}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Primeira vez?{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">Cadastrar instituição</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
