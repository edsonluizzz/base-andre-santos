/**
 * Interruptor dos formulários públicos por campanha.
 *
 * Campanhas listadas aqui NÃO recebem dados de formulários públicos
 * (cadastro, pedido de material, convite por link). Para reativar, remova o
 * id do conjunto e faça deploy. O descadastro (opt-out/LGPD) continua aberto.
 */
import { NextResponse } from "next/server";

// André Santos 2026 — campanha encerrada em 2026-10-05.
const CLOSED_CAMPAIGNS = new Set<string>(["andre-santos-2026"]);

export const PUBLIC_FORMS_CLOSED_MESSAGE =
  "Os cadastros estão encerrados. Obrigado pelo apoio!";

export function arePublicFormsClosed(campaignId: string): boolean {
  return CLOSED_CAMPAIGNS.has(campaignId);
}

export function publicFormsClosedResponse(headers?: Record<string, string>) {
  return NextResponse.json(
    { error: PUBLIC_FORMS_CLOSED_MESSAGE, closed: true },
    { status: 403, headers }
  );
}
