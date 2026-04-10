import Link from "next/link";
import { Cross } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade — Ovile Gestão",
  description: "Como o Ovile Gestão coleta, usa e protege seus dados pessoais conforme a LGPD.",
};

export default function PrivacidadePage() {
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

        <h1 className="text-3xl font-bold text-white mb-2">Política de Privacidade</h1>
        <p className="text-slate-500 text-sm mb-10">
          Última atualização: 10 de abril de 2026 · Em conformidade com a LGPD (Lei nº 13.709/2018)
        </p>

        <div className="space-y-8">

          <Section title="1. Controlador dos Dados">
            <p>
              O <strong>Ovile Gestão</strong> é o controlador dos dados pessoais coletados por meio desta
              plataforma. Para questões relacionadas à privacidade e proteção de dados, entre em contato
              pelo e-mail:{" "}
              <a href="mailto:privacidade@ovile.com.br" className="text-indigo-400 hover:text-indigo-300">
                privacidade@ovile.com.br
              </a>
            </p>
          </Section>

          <Section title="2. Dados Coletados">
            <p>Coletamos os seguintes dados pessoais:</p>
            <ul>
              <li><strong>Dados de identificação:</strong> nome, endereço de e-mail e foto de perfil (via Google OAuth).</li>
              <li><strong>Dados cadastrais dos membros:</strong> nome, data de nascimento, telefone, foto, status e notas inseridas pelo administrador da congregação.</li>
              <li><strong>Dados de pagamento:</strong> processados diretamente pelo Stripe; não armazenamos dados de cartão de crédito.</li>
              <li><strong>Dados de uso:</strong> registros de acesso, eventos de chamada, ofertas, despesas e atividades no sistema.</li>
              <li><strong>Dados técnicos:</strong> endereço IP, tipo de dispositivo e navegador (para segurança e diagnóstico).</li>
            </ul>
          </Section>

          <Section title="3. Finalidade e Base Legal do Tratamento">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-4 text-slate-300 font-medium">Finalidade</th>
                    <th className="text-left py-2 text-slate-300 font-medium">Base Legal (LGPD)</th>
                  </tr>
                </thead>
                <tbody className="text-slate-400 divide-y divide-white/5">
                  <tr><td className="py-2 pr-4">Prestação do serviço contratado</td><td className="py-2">Execução de contrato (Art. 7º, V)</td></tr>
                  <tr><td className="py-2 pr-4">Autenticação e segurança</td><td className="py-2">Legítimo interesse (Art. 7º, IX)</td></tr>
                  <tr><td className="py-2 pr-4">Processamento de pagamentos</td><td className="py-2">Execução de contrato (Art. 7º, V)</td></tr>
                  <tr><td className="py-2 pr-4">Envio de e-mails transacionais</td><td className="py-2">Execução de contrato (Art. 7º, V)</td></tr>
                  <tr><td className="py-2 pr-4">Melhorias no produto</td><td className="py-2">Legítimo interesse (Art. 7º, IX)</td></tr>
                  <tr><td className="py-2 pr-4">Cumprimento de obrigações legais</td><td className="py-2">Obrigação legal (Art. 7º, II)</td></tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="4. Compartilhamento de Dados">
            <p>
              Seus dados são compartilhados apenas com os seguintes terceiros, estritamente para a prestação
              do serviço:
            </p>
            <ul>
              <li><strong>Google (OAuth):</strong> autenticação de usuários.</li>
              <li><strong>Stripe:</strong> processamento de pagamentos. Política:{" "}
                <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">stripe.com/privacy</a>
              </li>
              <li><strong>Neon (PostgreSQL):</strong> armazenamento do banco de dados.</li>
              <li><strong>Vercel:</strong> hospedagem e infraestrutura.</li>
              <li><strong>Resend:</strong> envio de e-mails transacionais.</li>
            </ul>
            <p>Não vendemos nem compartilhamos seus dados com terceiros para fins de marketing.</p>
          </Section>

          <Section title="5. Direitos do Titular (LGPD)">
            <p>
              Nos termos da LGPD, você tem direito a:
            </p>
            <ul>
              <li><strong>Acesso:</strong> solicitar a confirmação e acesso aos seus dados.</li>
              <li><strong>Correção:</strong> solicitar a correção de dados incompletos ou incorretos.</li>
              <li><strong>Exclusão:</strong> solicitar a eliminação dos seus dados pessoais.</li>
              <li><strong>Portabilidade:</strong> solicitar a exportação dos seus dados.</li>
              <li><strong>Oposição:</strong> opor-se ao tratamento baseado em legítimo interesse.</li>
              <li><strong>Revogação:</strong> revogar o consentimento a qualquer momento.</li>
            </ul>
            <p>
              Para exercer seus direitos, entre em contato:{" "}
              <a href="mailto:privacidade@ovile.com.br" className="text-indigo-400 hover:text-indigo-300">
                privacidade@ovile.com.br
              </a>
              . Responderemos em até 15 dias úteis.
            </p>
          </Section>

          <Section title="6. Retenção de Dados">
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Após o encerramento da conta, os dados
              são retidos por até 5 anos para cumprimento de obrigações legais e fiscais, sendo então
              excluídos ou anonimizados.
            </p>
          </Section>

          <Section title="7. Segurança">
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo:
            </p>
            <ul>
              <li>Comunicação criptografada via HTTPS/TLS.</li>
              <li>Isolamento de dados por estabelecimento (multi-tenant).</li>
              <li>Autenticação via OAuth 2.0 com Google.</li>
              <li>Acesso restrito aos dados por função (ADMIN / LEADER / MEMBER).</li>
              <li>Banco de dados em ambiente de nuvem com backups automáticos.</li>
            </ul>
          </Section>

          <Section title="8. Cookies e Tecnologias de Rastreamento">
            <p>
              Utilizamos cookies de sessão estritamente necessários para autenticação e funcionamento do
              sistema. Não utilizamos cookies de rastreamento de terceiros para fins de publicidade.
            </p>
          </Section>

          <Section title="9. Dados de Menores">
            <p>
              O Serviço não é destinado a menores de 18 anos como usuários principais. Dados de membros
              menores de idade podem ser inseridos pelo administrador da congregação, que assume a
              responsabilidade por obter os consentimentos necessários.
            </p>
          </Section>

          <Section title="10. Alterações nesta Política">
            <p>
              Podemos atualizar esta Política periodicamente. Notificaremos por e-mail sobre alterações
              relevantes. O uso continuado do Serviço após a notificação constitui aceite da nova Política.
            </p>
          </Section>

          <Section title="11. Contato e Encarregado (DPO)">
            <p>
              Para exercer seus direitos ou tirar dúvidas sobre esta Política:
            </p>
            <ul>
              <li>E-mail: <a href="mailto:privacidade@ovile.com.br" className="text-indigo-400 hover:text-indigo-300">privacidade@ovile.com.br</a></li>
            </ul>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <span>© {new Date().getFullYear()} Ovile Gestão. Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <Link href="/termos" className="hover:text-slate-400 transition-colors">Termos de Uso</Link>
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
      <div className="text-slate-400 text-sm leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-slate-300 [&_a]:underline">
        {children}
      </div>
    </section>
  );
}
