import { useEffect, useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useGuardianAuth } from "@/lib/guardian-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Loader2,
  Play,
  User,
  GraduationCap,
  Shield,
  Heart,
} from "lucide-react";
import { Link } from "wouter";
import { API_URL } from "@/lib/api-url";

const DEMOS = [
  {
    role: "Administrador",
    email: "admin@teste.com",
    pass: "senha123",
    icon: Shield,
    desc: "Acesso total: Dashboard, relatórios BI, gestão de usuários e configurações",
  },
  {
    role: "Professor",
    email: "carlos.mendes@escolateste.com",
    pass: "senha123",
    icon: User,
    desc: "Criar provas, corrigir, enviar mensagens e ver relatórios de turma",
  },
  {
    role: "Aluno",
    email: "beatriz.alves@aluno.escolateste.com",
    pass: "senha123",
    icon: GraduationCap,
    desc: "Fazer provas, ver resultados e acompanhar desempenho",
  },
  {
    role: "Responsável",
    email: "maria.alves@teste.com",
    pass: "senha123",
    icon: Heart,
    desc: "Portal do responsável: notas, mensagens, dicas e calendário",
  },
];

export default function DemoPage() {
  const { login } = useAuth();
  const { login: guardianLogin } = useGuardianAuth();
  const loginMutation = useLogin();

  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);
  const [autoLogin, setAutoLogin] = useState(false);

  const doLogin = (email: string, password: string, role: string) => {
    setLoadingDemo(role);

    if (role === "Responsável") {
      fetch(`${API_URL}/api/guardians/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            guardianLogin(data.token, data.guardian);
            window.location.href = "/guardian";
          } else {
            setLoadingDemo(null);
            alert("Credenciais de demo inválidas.");
          }
        })
        .catch(() => {
          setLoadingDemo(null);
          alert("Erro ao conectar.");
        });

      return;
    }

    loginMutation.mutate(
      {
        data: {
          email,
          password,
        },
      },
      {
        onSuccess: (data: any) => {
          login(data.token);

          if (role === "Aluno") {
            window.location.href = "/student";
          } else {
            window.location.href = "/dashboard";
          }
        },
        onError: () => {
          setLoadingDemo(null);
          alert(
            "Credenciais de demo inválidas. Tente criar uma conta primeiro."
          );
        },
      }
    );
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const role = url.searchParams.get("role");

    if (role && !autoLogin) {
      const demo = DEMOS.find(
        (d) => d.role.toLowerCase() === role.toLowerCase()
      );

      if (demo) {
        setAutoLogin(true);
        doLogin(demo.email, demo.pass, demo.role);
      }
    }
  }, [autoLogin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex flex-col">
      <nav className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>

            <span className="font-bold text-lg">EduSaaS</span>
          </Link>

          <Link href="/login">
            <Button variant="outline" size="sm">
              Entrar
            </Button>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-3">
              Demonstração do EduSaaS
            </h1>

            <p className="text-muted-foreground max-w-lg mx-auto">
              Escolha um perfil para explorar a plataforma com dados reais de
              exemplo. Nenhum cadastro necessário.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEMOS.map((demo) => {
              const Icon = demo.icon;
              const isLoading = loadingDemo === demo.role;

              return (
                <Card
                  key={demo.role}
                  className="hover:border-primary/40 transition-colors cursor-pointer group"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {demo.role}
                        </h3>

                        <p className="text-sm text-muted-foreground mb-3">
                          {demo.desc}
                        </p>

                        <div className="text-xs text-muted-foreground bg-muted rounded px-2 py-1 inline-block font-mono">
                          {demo.email}
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full mt-4"
                      onClick={() =>
                        doLogin(demo.email, demo.pass, demo.role)
                      }
                      disabled={isLoading || !!loadingDemo}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Entrar como {demo.role}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Prefer criar sua própria instituição?{" "}
              <Link
                href="/register"
                className="text-primary hover:underline"
              >
                Cadastre-se gratuitamente{" "}
                <ArrowRight className="w-3 h-3 inline" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
