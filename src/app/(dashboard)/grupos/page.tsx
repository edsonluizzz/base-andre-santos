"use client";

import { MessageCircle } from "lucide-react";
import { ZapiGroupsLive } from "@/components/grupos/zapi-groups-panel";

/**
 * Grupos WhatsApp — administração AO VIVO dos grupos reais do número da
 * campanha (Z-API). A região definida aqui alimenta o roteamento do welcome
 * automático (WF2): lead da região X recebe o link real do grupo X.
 */
export default function GruposPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" /> Grupos WhatsApp
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grupos reais do número da campanha — participantes, links de convite e roteamento regional
        </p>
      </div>

      <ZapiGroupsLive />
    </div>
  );
}
