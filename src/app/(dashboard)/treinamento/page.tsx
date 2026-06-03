import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCampaignContext } from "@/lib/campaign-context";
import { validateCampaign } from "@/lib/validate-campaign";
import { TreinamentoDeck } from "@/components/treinamento/deck";

export const dynamic = "force-dynamic";

export default async function TreinamentoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Tenta Campaign.candidateName (global, canônico). Fallback pra
  // Settings.campaignName (tenant, legado). Sem hardcoded "André Santos".
  const cid = session.user.campaignId ?? "andre-santos-2026";
  const validated = await validateCampaign(cid);
  const { db } = getCampaignContext(session);
  const settings = await db.settings.findUnique({
    where: { id: "singleton" },
    select: { campaignName: true },
  }).catch(() => null);

  const candidateName =
    validated?.candidateName ?? settings?.campaignName ?? validated?.name ?? "candidato";

  return (
    <TreinamentoDeck
      candidateName={candidateName}
      userName={session.user.name ?? "apoiador"}
      userRole={session.user.role ?? "MEMBER"}
    />
  );
}
