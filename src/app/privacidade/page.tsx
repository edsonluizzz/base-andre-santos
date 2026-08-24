import Link from "next/link";
import { Star } from "lucide-react";
import { headers } from "next/headers";
import { db } from "@/lib/db";

export const metadata = { title: "Política de Privacidade — Ovile Eleitoral" };

const DEFAULT_CANDIDATE_NAME = "André Santos";
const DEFAULT_OFFICE = "Deputado Estadual";
const DEFAULT_DISTRICT = "PR";

// Campaign.district guarda a sigla (ex: "PR") — o texto legal abaixo lê melhor
// por extenso ("pelo Paraná"). Mapa pequeno, só para os estados já em uso.
const UF_FULL_NAME: Record<string, string> = { PR: "Paraná" };

async function getCandidateDisplay() {
  const h = await headers();
  const host = (h.get("host") ?? h.get("x-forwarded-host") ?? "").toLowerCase().split(":")[0].replace(/^www\./, "");
  const campaign = host
    ? await db.campaign.findFirst({
        where: { domain: host, active: true },
        select: { candidateName: true, office: true, district: true },
      }).catch(() => null)
    : null;
  const district = campaign?.district ?? DEFAULT_DISTRICT;
  return {
    candidateName: campaign?.candidateName ?? DEFAULT_CANDIDATE_NAME,
    office: campaign?.office ?? DEFAULT_OFFICE,
    district,
    districtFull: UF_FULL_NAME[district] ?? district,
  };
}

export default async function PrivacidadePage() {
  const { candidateName, office, district, districtFull } = await getCandidateDisplay();
  return (
    <div className="min-h-screen p-6 pb-16" style={{ background: "#0a1220" }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pt-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,107,4,0.12)", border: "1px solid rgba(255,107,4,0.25)" }}>
            <Star className="w-4 h-4" style={{ color: "#ff6b04" }} />
          </div>
          <div>
            <p className="text-[10px] tracking-[3px] uppercase" style={{ color: "rgba(255,107,4,0.7)" }}>Base de Apoio 2026</p>
            <p className="text-sm font-bold text-white">{candidateName} · {office} {district}</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Política de Privacidade</h1>
        <p className="text-sm text-slate-400 mb-8">Atualizada em maio de 2026 · Em conformidade com a LGPD (Lei 13.709/2018)</p>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-white mb-2">1. Quem somos</h2>
            <p>A <strong className="text-white">Base de Apoio {candidateName} 2026</strong> é o sistema interno de gestão de colaboradores e apoiadores da pré-candidatura de {candidateName} a {office} pelo {districtFull} nas eleições de 2026. As informações coletadas são tratadas pela equipe responsável pela campanha.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">2. Quais dados coletamos</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><strong className="text-slate-300">Nome completo</strong> — identificação do apoiador</li>
              <li><strong className="text-slate-300">WhatsApp</strong> — comunicação com a equipe</li>
              <li><strong className="text-slate-300">Cidade e bairro</strong> — mapeamento territorial da base</li>
              <li><strong className="text-slate-300">E-mail</strong> — opcional, para comunicados</li>
              <li><strong className="text-slate-300">Formas de contribuição declaradas</strong> — para direcionar o engajamento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">3. Para que usamos seus dados</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Organizar e gerenciar a base de apoio territorial</li>
              <li>Comunicar eventos, reuniões e informações sobre a candidatura</li>
              <li>Coordenar ações de mobilização política</li>
              <li>Produzir relatórios internos de cobertura geográfica</li>
            </ul>
            <p className="mt-2 text-slate-400">Seus dados <strong className="text-slate-300">não são vendidos, compartilhados com terceiros ou utilizados para fins comerciais</strong>.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">4. Base legal (LGPD Art. 7º)</h2>
            <p className="text-slate-400">O tratamento se fundamenta no <strong className="text-slate-300">consentimento expresso</strong> fornecido no momento do cadastro (LGPD Art. 7º, I) e no legítimo interesse para fins de atividade política (Art. 7º, IX).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">5. Seus direitos (LGPD Art. 18)</h2>
            <p className="text-slate-400 mb-2">Você tem direito a:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Confirmar a existência do tratamento dos seus dados</li>
              <li>Acessar seus dados</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li><strong className="text-slate-300">Solicitar a exclusão</strong> dos seus dados a qualquer momento</li>
              <li>Revogar o consentimento</li>
            </ul>
            <p className="mt-2 text-slate-400">Para exercer qualquer direito, entre em contato pelo WhatsApp da equipe ou pelo e-mail informado no cadastro.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">6. Retenção e segurança</h2>
            <p className="text-slate-400">Os dados são armazenados em banco de dados seguro (PostgreSQL / Neon) com acesso restrito à equipe autorizada. Serão mantidos até o encerramento do ciclo eleitoral 2026 ou até a solicitação de exclusão pelo titular.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">7. Cookies e rastreamento</h2>
            <p className="text-slate-400">O sistema de cadastro público não utiliza cookies de rastreamento ou publicidade. O parâmetro <code className="text-xs bg-white/10 rounded px-1 py-0.5">?ref=</code> na URL serve exclusivamente para identificar qual membro da equipe indicou o cadastro, para fins de gestão interna.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">8. Contato</h2>
            <p className="text-slate-400">Dúvidas, solicitações de exclusão ou exercício de direitos: entre em contato com a equipe de campanha pelo WhatsApp ou pelos canais oficiais de {candidateName}.</p>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.07] flex items-center justify-between">
          <p className="text-xs text-slate-500">Ovile Eleitoral · LGPD Art. 9</p>
          <Link href="/cadastro" className="text-xs underline underline-offset-2" style={{ color: "rgba(255,107,4,0.7)" }}>
            Voltar ao cadastro
          </Link>
        </div>

      </div>
    </div>
  );
}
