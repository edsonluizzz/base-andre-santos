import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Plus, Users, Database, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SwitchCampaignButton } from "@/components/campanhas/switch-campaign-button";

export const metadata = { title: "Campanhas — Ovile Eleitoral" };

export default async function CampanhasPage() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) redirect("/dashboard");

  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, slug: true, plan: true, active: true,
      candidateName: true, party: true, district: true, electionYear: true,
      primaryColor: true, adminEmail: true, dbUrl: true, createdAt: true,
      _count: { select: { collaborators: true, userCampaigns: true } },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="text-xl lg:text-2xl font-bold gradient-title">Campanhas</h1>
          <p className="text-sm text-muted-foreground mt-1">{campaigns.length} campanha{campaigns.length !== 1 ? "s" : ""} cadastrada{campaigns.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/nova-campanha">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Campanha
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="p-5 rounded-xl bg-white/[0.03] border border-white/10 space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex-shrink-0"
                  style={{ backgroundColor: c.primaryColor ?? "#1E40AF" }}
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{c.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {c.plan}
                    </Badge>
                    {c.active ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle2 className="h-3 w-3" /> Ativa
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <XCircle className="h-3 w-3" /> Inativa
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {c.candidateName && <span>{c.candidateName}</span>}
                    {c.party && <span> · {c.party}</span>}
                    {c.district && <span> · {c.district}</span>}
                    {c.electionYear && <span> · {c.electionYear}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right flex-shrink-0">
                <div>
                  <div className="flex items-center gap-1 text-sm font-medium justify-end">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    {c._count.collaborators}
                  </div>
                  <div className="text-xs text-muted-foreground">colaboradores</div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm font-medium justify-end">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    {c._count.userCampaigns}
                  </div>
                  <div className="text-xs text-muted-foreground">operadores</div>
                </div>
                {c.id === session.user.campaignId ? (
                  <Badge className="bg-primary/15 text-primary border-primary/30">Ativa agora</Badge>
                ) : (
                  <SwitchCampaignButton campaignId={c.id} />
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1 border-t border-white/5">
              <span className="font-mono">ID: {c.id}</span>
              {c.adminEmail && <span>Admin: {c.adminEmail}</span>}
              <span className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                {c.dbUrl ? "DB configurado" : <span className="text-amber-400">DB não configurado</span>}
              </span>
              <span>Criada em {new Date(c.createdAt).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
