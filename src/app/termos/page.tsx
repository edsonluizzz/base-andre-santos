import Link from "next/link";
import { Cross } from "lucide-react";

export const metadata = {
  title: "Termos de Uso — Ovile Gestão",
  description: "Termos e condições de uso da plataforma Ovile Gestão.",
};

export default function TermosPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "#06080F", color: "#e2e8f0" }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, #1e2456 0%, #06080F 65%)",
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-12">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/25">
              <Cross className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-sm font-semibold text-slate-400 group-hover:text-slate-300 transition-colors">
              Ovile <span className="text-indigo-400">Gestão</span>
            </span>
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Termos de Uso</h1>
        <p className="text-slate-500 text-sm mb-10">Última atualização: 10 de abril de 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8">

          <Section title="1. Aceitação dos Termos">
            <p>
              Ao acessar ou utilizar a plataforma <strong>Ovile Gestão</strong> (&ldquo;Serviço&rdquo;), você concorda
              com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize o Serviço.
            </p>
          </Section>

          <Section title="2. Descrição do Serviço">
            <p>
              O Ovile Gestão é uma plataforma SaaS (Software as a Service) destinada à gestão de igrejas e
              congregações, oferecendo módulos de membros, chamada, financeiro, ministérios, camisetas/congressos,
              aniversários e relatórios.
            </p>
          </Section>

          <Section title="3. Cadastro e Responsabilidades">
            <ul>
              <li>Você deve fornecer informações verdadeiras e manter seus dados atualizados.</li>
              <li>É responsável por manter a confidencialidade do acesso à sua conta.</li>
              <li>É responsável por todas as atividades realizadas em sua conta.</li>
              <li>Deve notificar imediatamente o Ovile em caso de uso não autorizado.</li>
            </ul>
          </Section>

          <Section title="4. Planos e Pagamentos">
            <p>
              O Serviço é oferecido no plano <strong>Gratuito</strong> (limitado a 10 membros) e no plano
              <strong> Pro</strong> (R$ 29,99/mês), com cobrança recorrente via Stripe.
            </p>
            <ul>
              <li>O plano Pro inclui período de teste gratuito de 7 dias.</li>
              <li>O cancelamento pode ser feito a qualquer momento pelo portal de assinatura.</li>
              <li>Não há reembolso de cobranças já processadas, exceto nos casos previstos em lei.</li>
              <li>O Ovile pode alterar os preços com aviso prévio de 30 dias por e-mail.</li>
            </ul>
          </Section>

          <Section title="5. Uso Aceitável">
            <p>Você concorda em não utilizar o Serviço para:</p>
            <ul>
              <li>Fins ilegais ou não autorizados.</li>
              <li>Violar direitos de terceiros ou a legislação vigente.</li>
              <li>Transmitir vírus ou códigos maliciosos.</li>
              <li>Tentar obter acesso não autorizado ao sistema ou dados de outros usuários.</li>
            </ul>
          </Section>

          <Section title="6. Propriedade Intelectual">
            <p>
              O Serviço, incluindo código, design, logotipos e conteúdos, é propriedade da Ovile Gestão e
              está protegido por leis de propriedade intelectual. Você não pode copiar, modificar, distribuir
              ou criar obras derivadas sem autorização expressa.
            </p>
          </Section>

          <Section title="7. Dados e Privacidade">
            <p>
              O tratamento dos seus dados pessoais é regido pela nossa{" "}
              <Link href="/privacidade" className="text-indigo-400 hover:text-indigo-300 underline">
                Política de Privacidade
              </Link>
              , em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
          </Section>

          <Section title="8. Disponibilidade e SLA">
            <p>
              Nos esforçamos para manter o Serviço disponível continuamente, mas não garantimos 100% de uptime.
              Manutenções programadas serão comunicadas com antecedência sempre que possível. O Ovile não se
              responsabiliza por perdas decorrentes de indisponibilidade temporária.
            </p>
          </Section>

          <Section title="9. Limitação de Responsabilidade">
            <p>
              Na máxima extensão permitida por lei, o Ovile não será responsável por danos indiretos, incidentais
              ou consequenciais decorrentes do uso ou incapacidade de uso do Serviço.
            </p>
          </Section>

          <Section title="10. Rescisão">
            <p>
              Podemos suspender ou encerrar sua conta a qualquer momento por violação destes Termos. Você pode
              encerrar sua conta a qualquer momento pelo painel de configurações.
            </p>
          </Section>

          <Section title="11. Alterações nos Termos">
            <p>
              Podemos atualizar estes Termos periodicamente. Notificaremos por e-mail sobre alterações
              significativas. O uso continuado após a notificação constitui aceite dos novos termos.
            </p>
          </Section>

          <Section title="12. Lei Aplicável e Foro">
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da
              Comarca de Florianópolis/SC para dirimir quaisquer controvérsias.
            </p>
          </Section>

          <Section title="13. Contato">
            <p>
              Para dúvidas sobre estes Termos, entre em contato:{" "}
              <a href="mailto:contato@ovile.com.br" className="text-indigo-400 hover:text-indigo-300">
                contato@ovile.com.br
              </a>
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <span>© {new Date().getFullYear()} Ovile Gestão. Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <Link href="/privacidade" className="hover:text-slate-400 transition-colors">Política de Privacidade</Link>
            <Link href="/" className="hover:text-slate-400 transition-colors">Voltar ao início</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-white mb-3">{title}</h2>
      <div className="text-slate-400 text-sm leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-slate-300">
        {children}
      </div>
    </section>
  );
}
