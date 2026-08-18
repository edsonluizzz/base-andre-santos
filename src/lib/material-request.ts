import type { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";
import { buildTermoApoiadorPdf } from "./termo-apoiador-pdf";
import { committeeFromSettings, formatDeliveryAddress, TERM_VERSION } from "./termo-apoiador";
import { sendMaterialRequestEmail } from "./email";
import { zapiSendDocument, toZapiPhone, ZapiNotConfiguredError } from "./zapi";
import type { MaterialRequestItem } from "./material-catalog";

async function loadTermoData(db: PrismaClient, materialRequestId: string, campaignId: string) {
  const mr = await db.materialRequest.findUnique({
    where: { id: materialRequestId },
    select: {
      items: true,
      termSnapshotName: true,
      termSnapshotCpf: true,
      termAcceptedAt: true,
      termIp: true,
      deliveryCep: true, deliveryLogradouro: true, deliveryNumero: true,
      deliveryComplemento: true, deliveryBairro: true, deliveryMunicipio: true, deliveryUf: true,
      collaborator: { select: { email: true, phone: true } },
    },
  });
  if (!mr) return null;

  const [campaign, settings] = await Promise.all([
    db.campaign.findUnique({
      where: { id: campaignId },
      select: { candidateName: true, name: true, office: true, party: true, electionYear: true },
    }),
    db.settings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton", campaignName: "Base Andre Santos", updatedAt: new Date() },
      select: {
        razaoSocial: true, cnpj: true, cnpjLogradouro: true, cnpjNumero: true,
        cnpjComplemento: true, cnpjBairro: true, cnpjCep: true, cnpjMunicipio: true, cnpjUf: true,
      },
    }),
  ]);

  const candidateName = campaign?.candidateName ?? campaign?.name ?? "Campanha";
  return { mr, campaign, settings, candidateName };
}

/**
 * Gera o PDF do Termo (já assinado via clickwrap) e sobe pro Blob. Rápido
 * (segundos) — chamado de forma síncrona pela rota pública, pra já devolver
 * `pdfUrl` no response e permitir download imediato na tela de sucesso.
 * Mesmo padrão de PDF/Blob já validado em produção em receipts.ts.
 */
export async function generateTermoApoiadorPdf(
  db: PrismaClient,
  materialRequestId: string,
  campaignId: string,
): Promise<string | null> {
  try {
    const loaded = await loadTermoData(db, materialRequestId, campaignId);
    if (!loaded) return null;
    const { mr, campaign, settings, candidateName } = loaded;

    const pdfBuffer = await buildTermoApoiadorPdf({
      supporterName: mr.termSnapshotName,
      supporterCpf: mr.termSnapshotCpf,
      deliveryAddress: formatDeliveryAddress(mr),
      items: mr.items as unknown as MaterialRequestItem[],
      acceptedAt: mr.termAcceptedAt,
      ip: mr.termIp,
      candidateName,
      office: campaign?.office ?? null,
      party: campaign?.party ?? null,
      electionYear: campaign?.electionYear ?? null,
      committee: committeeFromSettings(settings),
    });

    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN ausente");
    const safeName = mr.termSnapshotName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`termo-apoiador/${safeName}-${materialRequestId}.pdf`, pdfBuffer, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
      contentType: "application/pdf",
    });
    await db.materialRequest.update({ where: { id: materialRequestId }, data: { pdfUrl: blob.url } });
    return blob.url;
  } catch (err) {
    console.error("[material-request] falha ao gerar/subir PDF:", err);
    return null;
  }
}

/**
 * Envia o PDF já gerado por email/WhatsApp — best-effort, nunca lança.
 * Chamada fire-and-forget (não bloqueia o response da rota pública).
 */
export async function sendTermoApoiadorChannels(
  db: PrismaClient,
  materialRequestId: string,
  campaignId: string,
  pdfUrl: string,
): Promise<void> {
  try {
    const mr = await db.materialRequest.findUnique({
      where: { id: materialRequestId },
      select: { termSnapshotName: true, collaborator: { select: { email: true, phone: true } } },
    });
    if (!mr) return;

    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      select: { candidateName: true, name: true },
    });
    const candidateName = campaign?.candidateName ?? campaign?.name ?? "Campanha";

    let emailStatus: "SKIPPED" | "SENT" | "FAILED" = "SKIPPED";
    let emailError: string | null = null;
    if (mr.collaborator.email) {
      try {
        const pdfRes = await fetch(pdfUrl);
        const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
        await sendMaterialRequestEmail({
          to: mr.collaborator.email,
          supporterName: mr.termSnapshotName,
          pdfBuffer,
          fileName: `termo-apoiador-${materialRequestId}.pdf`,
          campaignName: candidateName,
        });
        emailStatus = "SENT";
      } catch (err) {
        emailStatus = "FAILED";
        emailError = err instanceof Error ? err.message : "Falha ao enviar email";
        console.error("[material-request] falha ao enviar email:", err);
      }
    }

    let whatsappStatus: "SKIPPED" | "SENT" | "FAILED" = "SKIPPED";
    let whatsappError: string | null = null;
    if (mr.collaborator.phone) {
      const phone = toZapiPhone(mr.collaborator.phone);
      if (!phone) {
        whatsappStatus = "FAILED";
        whatsappError = "Telefone inválido";
      } else {
        try {
          await zapiSendDocument(campaignId, phone, pdfUrl, `termo-apoiador-${materialRequestId}.pdf`);
          whatsappStatus = "SENT";
        } catch (err) {
          whatsappStatus = "FAILED";
          whatsappError = err instanceof ZapiNotConfiguredError
            ? "WhatsApp não configurado"
            : err instanceof Error ? err.message : "Falha ao enviar WhatsApp";
          console.error("[material-request] falha ao enviar whatsapp:", err);
        }
      }
    }

    await db.materialRequest.update({
      where: { id: materialRequestId },
      data: { emailStatus, emailError, whatsappStatus, whatsappError },
    });
  } catch (err) {
    console.error("[material-request] sendTermoApoiadorChannels erro:", err);
  }
}

export { TERM_VERSION };
