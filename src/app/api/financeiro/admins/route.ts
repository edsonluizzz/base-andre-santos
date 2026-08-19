import { NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";

/** Lista quem tem acesso ao /financeiro (via FINANCE_ADMIN_EMAILS), cruzando com contas já existentes. */
export async function GET() {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const emails = (process.env.FINANCE_ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const users = emails.length
      ? await gate.db.user.findMany({
          where: { email: { in: emails } },
          select: { email: true, name: true, image: true },
        })
      : [];
    const byEmail = new Map(users.map((u) => [u.email?.toLowerCase(), u]));

    const data = emails.map((email) => {
      const user = byEmail.get(email);
      return { email, name: user?.name ?? null, image: user?.image ?? null, hasAccount: Boolean(user) };
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[api/financeiro/admins GET] erro:", err);
    return NextResponse.json({ error: "Erro ao listar acessos" }, { status: 500 });
  }
}
