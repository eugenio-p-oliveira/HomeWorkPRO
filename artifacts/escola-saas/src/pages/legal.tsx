import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type LegalTopic = "privacy" | "terms" | "security";

const CONTENT: Record<LegalTopic, { title: string; intro: string; sections: { title: string; body: string }[] }> = {
  privacy: {
    title: "Política de Privacidade",
    intro: "Esta página explica, de forma resumida, como o HomeWorkPRO trata dados usados na gestão educacional. Antes de um contrato com uma instituição, os termos devem ser revisados e formalizados com o responsável pelo tratamento.",
    sections: [
      { title: "Dados tratados", body: "Podem ser tratados dados de identificação e contato de administradores, professores, alunos e responsáveis, além de registros acadêmicos inseridos pela instituição." },
      { title: "Finalidade e acesso", body: "Os dados são usados para autenticação, aplicação de avaliações, relatórios pedagógicos e comunicação entre a instituição e seus usuários. O acesso deve seguir o perfil e a instituição do usuário." },
      { title: "Responsabilidades", body: "A instituição define as finalidades educacionais e deve cadastrar apenas dados necessários, manter credenciais protegidas e atender solicitações dos titulares. O HomeWorkPRO atua como plataforma de apoio." },
      { title: "Solicitações e retenção", body: "Para solicitar acesso, correção, exportação ou exclusão, entre em contato com a instituição responsável. O período de retenção deve ser definido no contrato conforme a finalidade e as obrigações legais." },
    ],
  },
  terms: {
    title: "Termos de Uso",
    intro: "O HomeWorkPRO é uma plataforma para criação de avaliações, acompanhamento pedagógico e comunicação escolar. O uso por uma instituição depende da aceitação destes termos e de eventual contrato comercial.",
    sections: [
      { title: "Uso permitido", body: "A plataforma deve ser usada por instituições e seus usuários autorizados para finalidades educacionais legítimas. É proibido compartilhar credenciais, tentar acessar outro tenant ou inserir conteúdo ilícito." },
      { title: "Conta e segurança", body: "O administrador da instituição é responsável por convidar usuários, revisar permissões e comunicar suspeitas de acesso indevido. Cada pessoa deve usar sua própria conta." },
      { title: "Conteúdo da instituição", body: "A instituição permanece responsável pelos dados, provas, mensagens e materiais inseridos. A equipe deve conferir informações antes de publicar avaliações ou enviar comunicações." },
      { title: "Disponibilidade", body: "Recursos, suporte, disponibilidade, backups e eventuais níveis de serviço devem ser definidos no plano ou contrato aplicável. Recursos ainda não contratados não devem ser considerados garantia de serviço." },
    ],
  },
  security: {
    title: "Segurança e Conformidade",
    intro: "Segurança é uma responsabilidade compartilhada. O HomeWorkPRO aplica controles técnicos no acesso à API, isolamento por instituição e autorização por papel; a operação comercial ainda exige infraestrutura persistente, backups e processo formal de incidentes.",
    sections: [
      { title: "Controles atuais", body: "A API valida tokens assinados, expiração, tenant e papel do usuário. Senhas são armazenadas com hash, rotas sensíveis usam limitação de requisições e entradas são validadas antes das mutações." },
      { title: "Dados escolares", body: "A aplicação deve ser usada com dados de demonstração até que o ambiente de clientes tenha armazenamento persistente, backup e restauração testados. Não use dados reais de alunos em um ambiente não contratado." },
      { title: "Incidentes", body: "Suspeitas de acesso indevido devem ser comunicadas imediatamente à instituição administradora e ao suporte do produto. O plano operacional deve registrar, conter, investigar e comunicar incidentes conforme a legislação aplicável." },
      { title: "Contato", body: "Para dúvidas comerciais ou de segurança, use o canal de contato informado na página inicial: eugenio.p.oliveira@outlook.com." },
    ],
  },
};

export default function LegalPage({ topic }: { topic: LegalTopic }) {
  const content = CONTENT[topic];
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-10">
          <ArrowLeft className="w-4 h-4" /> Voltar para o início
        </Link>
        <div className="flex items-start gap-4 mb-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {topic === "security" ? <ShieldCheck className="w-5 h-5 text-primary" /> : <CheckCircle2 className="w-5 h-5 text-primary" />}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">HomeWorkPRO</p>
            <h1 className="text-3xl font-bold">{content.title}</h1>
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed mb-10">{content.intro}</p>
        <div className="space-y-6">
          {content.sections.map(section => (
            <section key={section.title} className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold text-lg mb-2">{section.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
        <div className="mt-10">
          <Link href="/register"><Button>Começar uma demonstração</Button></Link>
        </div>
      </div>
    </main>
  );
}