import { useState } from "react";
import { useGuardianAuth } from "@/lib/guardian-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { School, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { API_URL } from "@/lib/api-url";

export default function GuardianLoginPage() {
  const { login } = useGuardianAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/guardians/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao entrar");
        return;
      }
      login(data.token, data.guardian);
      toast.success(`Bem-vindo, ${data.guardian.name}!`);
    } catch (err) {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side */}
      <div className="hidden md:flex md:w-1/2 bg-primary flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <School className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg">HomeWorkPRO</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Portal de Responsáveis</h1>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            Acompanhe o desempenho, receba alertas e dicas para apoiar a educação do seu filho.
          </p>
        </div>
        <div className="flex gap-4 text-sm text-primary-foreground/70">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-white">Provas</span>
            <span>Alertas de provas</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-white">Relatórios</span>
            <span>Desempenho escolar</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-white">Dicas</span>
            <span>Apoio pedagógico</span>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Entrar como Responsável</h2>
            <p className="text-sm text-muted-foreground">Acesse o portal para acompanhar seu filho</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="text-center space-y-2">
            <Link href="/login" className="text-sm text-primary hover:underline block">
              Sou professor ou funcionário
            </Link>
            <Link href="/" className="text-sm text-muted-foreground hover:underline block">
              ← Voltar ao site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
