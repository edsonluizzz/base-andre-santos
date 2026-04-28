import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const ACTION_LABEL: Record<string, string> = {
  GRANT_ACCESS: "Concedeu acesso",
  REVOKE_ACCESS: "Revogou acesso",
  UPDATE_USER: "Alterou permissão",
  IMPERSONATE_START: "Iniciou impersonação",
  IMPERSONATE_END: "Encerrou impersonação",
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const actorIds = [...new Set(logs.map((l) => l.actorId))];
    const targetIds = [...new Set(logs.map((l) => l.targetId).filter(Boolean))] as string[];
    const allIds = [...new Set([...actorIds, ...targetIds])];

    const users = allIds.length > 0
      ? await db.user.findMany({ where: { id: { in: allIds } }, select: { id: true, name: true, email: true } })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const result = logs.map((l) => ({
      id: l.id,
      action: l.action,
      actionLabel: ACTION_LABEL[l.action] ?? l.action,
      actor: userMap[l.actorId] ?? { id: l.actorId, name: "Desconhecido", email: null },
      target: l.targetId ? (userMap[l.targetId] ?? null) : null,
      metadata: l.metadata,
      createdAt: l.createdAt,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin/audit GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
