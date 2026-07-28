import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { normalizeCity, normalizePhone } from "@/lib/utils";
import { normalizeCpf, isValidCpf } from "@/lib/cpf";


export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);

    const { name, phone, cpf, city, neighborhood, profile, contributionTypes } = await req.json();

    if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ error: "WhatsApp inválido" }, { status: 400 });
    }
    const cleanCpf = normalizeCpf(cpf ?? "");
    if (!isValidCpf(cleanCpf)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
    }

    const userId = session.user.id;
    const cleanPhone = phone.replace(/\D/g, "");
    const pNorm = normalizePhone(cleanPhone);

    // Colaborador recém-criado no login (vinculado ao userId), se houver.
    const existing = await db.collaborator.findUnique({ where: { userId } });

    // Cadastro PRÉVIO com o mesmo telefone, ainda não vinculado a ninguém
    // (ex.: cadastrado na rua, sem e-mail). Se existir, mesclamos nele em vez de
    // manter um duplicado — o login passa a apontar para o cadastro original.
    const prior = pNorm
      ? await db.collaborator.findFirst({
          where: {
            campaignId: cid,
            phoneNormalized: pNorm,
            userId: null,
            ...(existing ? { id: { not: existing.id } } : {}),
          },
          orderBy: { createdAt: "asc" },
        })
      : null;

    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });

    // Só mescla automaticamente se o colaborador do login ainda é o registro vazio
    // criado na autenticação (sem telefone). Se ele já tem telefone, é um cadastro
    // real — não apagamos por engano; eventual duplicata fica para o merge manual.
    const canMerge = !!prior && (!existing || !existing.phoneNormalized);

    if (prior && canMerge) {
      // Libera o userId do colaborador recém-criado (B, sem histórico) para poder
      // vinculá-lo ao cadastro prévio (A) — userId é único por colaborador.
      if (existing) {
        await db.collaborator.delete({ where: { id: existing.id } }).catch(() => {});
      }
      await db.collaborator.update({
        where: { id: prior.id },
        data: {
          userId,
          name: name.trim(),
          phone: cleanPhone,
          phoneNormalized: pNorm,
          cpf: cleanCpf || prior.cpf,
          city: normalizeCity(city) || prior.city,
          neighborhood: neighborhood?.trim() || prior.neighborhood,
          email: user?.email ?? prior.email,
          profile: profile ?? prior.profile,
          contributionTypes: (Array.isArray(contributionTypes) && contributionTypes.length)
            ? contributionTypes
            : prior.contributionTypes,
          status: "ACTIVE",
        },
      });
    } else if (existing) {
      await db.collaborator.update({
        where: { id: existing.id },
        data: {
          name: name.trim(),
          phone: cleanPhone,
          phoneNormalized: pNorm,
          cpf: cleanCpf || existing.cpf,
          city: normalizeCity(city),
          neighborhood: neighborhood?.trim() || null,
          profile: profile ?? existing.profile,
          contributionTypes: contributionTypes ?? existing.contributionTypes,
          status: "ACTIVE",
        },
      });
    } else {
      await db.collaborator.create({
        data: {
          campaignId: cid,
          userId,
          name: name.trim(),
          phone: cleanPhone,
          phoneNormalized: pNorm,
          cpf: cleanCpf,
          city: normalizeCity(city),
          neighborhood: neighborhood?.trim() || null,
          email: user?.email ?? null,
          profile: profile ?? "APOIADOR",
          contributionTypes: contributionTypes ?? [],
          status: "ACTIVE",
          source: "CONVITE_LINK",
        },
      });
    }

    await db.user.update({ where: { id: userId }, data: { name: name.trim() } }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[invite/complete-profile] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
