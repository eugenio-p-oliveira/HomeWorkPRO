import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { School, Check, X, FileText, Users, BarChart3, Shield, Clock, MessageSquare, Calendar, Globe, Zap, ArrowRight, Menu, ChevronDown } from "lucide-react";

const PLANS = [
  {
    name: "Inicial",
    price: 79,
    period: "por mês",
    description: "Perfeito para pequenas escolas e professores autônomos",
    badge: "Popular",
    badgeColor: "bg-amber-500 text-white",
    features: [
      { text: "Até 150 alunos", included: true },
      { text: "Até 3 professores", included: true },
      { text: "Provas e simulados", included: true },
      { text: "Correção automática", included: true },
      { text: "Relatórios básicos", included: true },
      { text: "1 disciplina/ano", included: true },
      { text: "Suporte por e-mail", included: true },
      { text: "Portal de responsáveis", included: false },
      { text: "Calendário escolar", included: false },
      { text: "Relatórios avançados", included: false },
      { text: "API pública", included: false },
      { text: "Suporte prioritário", included: false },
    ],
    highlight: false,
  },
  {
    name: "Intermediário",
    price: 179,
    period: "por mês",
    description: "Para escolas em crescimento que precisam de mais estrutura",
    badge: "Mais Vendido",
    badgeColor: "bg-primary text-white",
    features: [
      { text: "Até 500 alunos", included: true },
      { text: "Até 15 professores", included: true },
      { text: "Provas e simulados", included: true },
      { text: "Correção automática", included: true },
      { text: "Relatórios básicos", included: true },
      { text: "Disciplinas ilimitadas", included: true },
      { text: "Suporte por e-mail", included: true },
      { text: "Portal de responsáveis", included: true },
      { text: "Calendário escolar", included: true },
      { text: "Relatórios avançados", included: false },
      { text: "API pública", included: false },
      { text: "Suporte prioritário", included: false },
    ],
    highlight: true,
  },
  {
    name: "Robusto",
    price: 349,
    period: "por mês",
    description: "Solução completa para instituições de grande porte",
    badge: "Enterprise",
    badgeColor: "bg-slate-700 text-white",
    features: [
      { text: "Alunos ilimitados", included: true },
      { text: "Professores ilimitados", included: true },
      { text: "Provas e simulados", included: true },
      { text: "Correção automática", included: true },
      { text: "Relatórios básicos", included: true },
      { text: "Disciplinas ilimitadas", included: true },
      { text: "Suporte por e-mail", included: true },
      { text: "Portal de responsáveis", included: true },
      { text: "Calendário escolar", included: true },
      { text: "Relatórios avançados", included: true },
      { text: "API pública", included: true },
      { text: "Suporte prioritário", included: true },
    ],
    highlight: false,
  },
  {
    name: "Customizado",
    price: null,
    period: "sob consulta",
    description: "Solução sob medida para redes e grupos escolares",
    badge: "Personalizado",
    badgeColor: "bg-emerald-600 text-white",
    features: [
      { text: "Tudo do plano Robusto", included: true },
      { text: "Integração com sistema próprio", included: true },
      { text: "White-label / marca própria", included: true },
      { text: "SLA garantido", included: true },
      { text: "Treinamento presencial", included: true },
      { text: "Consultoria pedagógica", included: true },
      { text: "Desenvolvimento customizado", included: true },
      { text: "Dedicado account manager", included: true },
      { text: "Banco de dados isolado", included: true },
      { text: "Backup automático diário", included: true },
      { text: "Infraestrutura dedicada", included: true },
      { text: "Auditoria de segurança", included: true },
    ],
    highlight: false,
  },
];

const FEATURES = [
  { icon: FileText, title: "Provas e Simulados", desc: "Crie provas do tipo ENEM, simulados, provas tradicionais e atividades. Correção automática instantânea." },
  { icon: BarChart3, title: "Relatórios Pedagógicos", desc: "Dashboards com gráficos de desempenho, análise por disciplina, evolução temporal e ranking de turmas." },
  { icon: Users, title: "Portal de Responsáveis", desc: "Pais acompanham notas, recebem alertas de provas, dicas de estudo e acessam o calendário escolar." },
  { icon: Shield, title: "Multi-tenant Seguro", desc: "Cada instituição tem seus dados isolados. JWT com expiração, controle de acesso por perfil." },
  { icon: Clock, title: "Timer e Agendamento", desc: "Provas com tempo limitado, agendamento de início e término, múltiplas tentativas configuráveis." },
  { icon: MessageSquare, title: "Comunicação Direta", desc: "Professores e coordenadores enviam mensagens diretamente aos responsáveis com resultados e dicas." },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPlan, setShowPlan] = useState(false);

  const scrollToPlans = () => {
    setShowPlan(true);
    document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <School className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">EduSaaS</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#recursos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
            <a href="#planos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Planos</a>
            <a href="#demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Demonstração</a>
            <Link href="/login">
              <Button variant="outline" size="sm">Entrar</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Começar Agora</Button>
            </Link>
          </div>
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu className="w-5 h-5" />
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden px-6 py-4 space-y-3 border-t border-border">
            <a href="#recursos" className="block text-sm text-muted-foreground">Recursos</a>
            <a href="#planos" className="block text-sm text-muted-foreground">Planos</a>
            <a href="#demo" className="block text-sm text-muted-foreground">Demonstração</a>
            <Link href="/login" className="block text-sm text-primary">Entrar</Link>
            <Link href="/register" className="block text-sm text-primary">Começar Agora</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-4 text-sm">Plataforma Educacional Multi-tenant</Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Gestão escolar e avaliações
              <span className="text-primary block mt-2">com inteligência pedagógica</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Crie provas com correção automática, acompanhe o desempenho de cada aluno, comunique-se com os responsáveis e gere relatórios completos em minutos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <Button size="lg" className="text-base">
                  Começar Gratuitamente <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-base" onClick={scrollToPlans}>
                Ver Planos
              </Button>
            </div>
            <div className="mt-10 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-primary" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-primary" />
                <span>Cancelamento a qualquer momento</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-primary" />
                <span>Setup em 5 minutos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Tudo que sua escola precisa</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Uma plataforma completa que conecta alunos, professores, coordenadores e responsáveis.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <Card key={i} className="group hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="py-20 bg-primary/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">Veja como funciona</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">1</div>
                  <div>
                    <h4 className="font-semibold">Cadastre sua instituição</h4>
                    <p className="text-sm text-muted-foreground">Crie sua escola em 2 minutos. Configure séries, turmas, disciplinas e adicione professores.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">2</div>
                  <div>
                    <h4 className="font-semibold">Crie provas e questões</h4>
                    <p className="text-sm text-muted-foreground">Monte provas do tipo ENEM, simulados ou atividades. Adicione explicações e configure tempo.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">3</div>
                  <div>
                    <h4 className="font-semibold">Alunos respondem</h4>
                    <p className="text-sm text-muted-foreground">Os alunos acessam com login próprio, fazem as provas com timer e recebem correção instantânea.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">4</div>
                  <div>
                    <h4 className="font-semibold">Acompanhe e comunique</h4>
                    <p className="text-sm text-muted-foreground">Veja relatórios com gráficos, envie mensagens aos responsáveis e monitore o desempenho em tempo real.</p>
                  </div>
                </div>
              </div>
              <Link href="/register">
                <Button size="lg" className="mt-4">
                  Experimentar Agora <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <div className="font-medium text-sm">Simulado ENEM — 3° ano</div>
                    <div className="text-xs text-muted-foreground">45 alunos respondendo · 120 minutos</div>
                  </div>
                  <Badge className="ml-auto text-xs">Ativo</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-card border border-border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-primary">87%</div>
                    <div className="text-xs text-muted-foreground">Média geral</div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-primary">12</div>
                    <div className="text-xs text-muted-foreground">Provas ativas</div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-primary">342</div>
                    <div className="text-xs text-muted-foreground">Alunos</div>
                  </div>
                </div>
                <div className="p-3 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Desempenho por Disciplina</span>
                  </div>
                  <div className="space-y-2">
                    {["Matemática", "Física", "História", "Biologia"].map((sub, i) => (
                      <div key={sub} className="flex items-center gap-2">
                        <span className="text-xs w-20">{sub}</span>
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${[92, 78, 85, 88][i]}%` }} />
                        </div>
                        <span className="text-xs font-medium">{[92, 78, 85, 88][i]}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="planos" className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Planos e Preços</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Escolha o plano ideal para sua instituição. Todos os planos incluem suporte técnico e atualizações gratuitas.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {PLANS.map((plan, i) => (
              <Card key={i} className={`relative ${plan.highlight ? "border-primary shadow-lg ring-1 ring-primary/20" : ""}`}>
                <div className="absolute top-4 right-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${plan.badgeColor}`}>{plan.badge}</span>
                </div>
                <CardHeader className="pt-8 pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    {plan.price ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">R${plan.price}</span>
                        <span className="text-sm text-muted-foreground">{plan.period}</span>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold">Sob Consulta</div>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {plan.features.map((f, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm">
                        {f.included ? (
                          <Check className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                        )}
                        <span className={f.included ? "text-foreground" : "text-muted-foreground/60"}>{f.text}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/register">
                    <Button className="w-full" variant={plan.highlight ? "default" : "outline"}>
                      {plan.price ? "Começar" : "Falar com Vendas"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-10 text-center text-sm text-muted-foreground">
            <p>Preços em Reais (R$). Faturamento mensal. Desconto de 15% para pagamento anual.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <School className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold">EduSaaS</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Plataforma educacional multi-tenant para gestão escolar, provas e acompanhamento pedagógico.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Produto</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <a href="#recursos" className="block hover:text-foreground">Recursos</a>
                <a href="#planos" className="block hover:text-foreground">Planos</a>
                <a href="#demo" className="block hover:text-foreground">Demonstração</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Acesso</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link href="/login" className="block hover:text-foreground">Entrar</Link>
                <Link href="/register" className="block hover:text-foreground">Cadastrar instituição</Link>
                <Link href="/guardian/login" className="block hover:text-foreground">Portal de Responsáveis</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Contato</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>contato@edusaas.com.br</p>
                <p>(11) 4000-1234</p>
                <p>São Paulo, SP</p>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            © 2026 EduSaaS. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
