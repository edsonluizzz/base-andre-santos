import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCampaignContext } from "@/lib/campaign-context";
import { TreinamentoDeck } from "@/components/treinamento/deck";

export const dynamic = "force-dynamic";

export default async function TreinamentoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { db } = getCampaignContext(session);
  const settings = await db.settings.findUnique({
    where: { id: "singleton" },
    select: { campaignName: true },
  });

  return (
    <TreinamentoDeck
      candidateName={settings?.campaignName ?? "André Santos"}
      userName={session.user.name ?? "apoiador"}
      userRole={session.user.role ?? "MEMBER"}
    />
  );
}
