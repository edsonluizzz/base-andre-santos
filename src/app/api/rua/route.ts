import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { ensureCityGoal } from "@/lib/municipality-goals";
import { recalcTier } from "@/lib/tier";
import { isRateLimited } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/utils";
import { canonicalPRCity } from "@/lib/pr-cities";

// Cadastro de rua: o COLABORADOR logado cadastra outras pessoas (não auto-cadastro).
// Atribuição automática ao usuário logado (registeredById = session.user.id), mesma
// semântica do refUserId no cadastro público. Cidade do PR é OBRIGATÓRIA — sem ela o
// apoiador não aparece no Mapa de Apoio.

const ruaSchema = z.object({
  name: z.string().min(2).max(255),
  phone: z.string().min(10).max(20),
  city: z.string().min(2).max(100),
  neighborhood: z.string().max(100).optional().or(z.literal("")),
  lgpdConsent: z.literal(true), // aceite verbal: o colaborador declara que a pessoa autorizou
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ruaSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Dados inválidos";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { name, phone, city, neighborhood } = parsed.data;

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: "Número de WhatsApp inválido" }, { status: 400 });
    }

    // Cidade precisa ser um município do PR — grava sempre a grafia canônica.
    const prCity = canonicalPRCity(city);
    if (!prCity) {
      return NextResponse.json(
        { error: "A cidade precisa ser um município do Paraná." },
        { status: 400 },
      );
    }

    const { db, cid: CID } = getCampaignContext(session);
    const registeredById = session.user.id;

    // Rate-limit por usuário (operador faz muitos seguidos) — folgado.
    if (await isRateLimited("cadastro_rua", registeredById, 120, 60)) {
      return NextResponse.json(
        { error: "Muitos cadastros em sequência. Aguarde alguns segundos." },
        { status: 429 },
      );
    }

    // Dedup por telefone (mesma campanha) — retorna o existente sem duplicar.
    const pNorm = normalizePhone(cleanPhone);
    const existing = pNorm
      ? await db.collaborator.findFirst({
          where: { campaignId: CID, phoneNormalized: pNorm },
          select: { id: true },
        })
      : null;
    if (existing) {
      return NextResponse.json(
        { message: "Esta pessoa já estava cadastrada.", collaboratorId: existing.id, duplicate: true },
        { status: 200 },
      );
    }

    const created = await db.collaborator.create({
      data: {
        campaignId: CID,
        name: name.trim(),
        phone: cleanPhone,
        phoneNormalized: pNorm,
        city: prCity,
        neighborhood: neighborhood?.trim() || null,
        campaignRole: "VOLUNTARIO",
        status: "LEAD",
        source: "RUA",
        registeredById,
        lgpdConsent: true,
        lgpdConsentAt: new Date(),
      },
      select: { id: true },
    });

    // Best-effort (não bloqueia o response): meta da cidade p/ o Mapa + tier do colaborador.
    ensureCityGoal(prCity, db, CID).catch(() => {});
    recalcTier(registeredById, db, CID).catch(() => {});

    return NextResponse.json({ collaboratorId: created.id }, { status: 201 });
  } catch (err) {
    console.error("[api/rua] erro:", err);
    return NextResponse.json({ error: "Erro ao cadastrar. Tente novamente." }, { status: 500 });
  }
}
