import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";

const MODULES = [
  "MEMBERS", "ATTENDANCE", "FINANCIAL", "REPORTS",
  "EVENTS", "BIRTHDAYS", "SHIRTS", "SETTINGS", "USERS",
] as const;
const ACTIONS = ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { churchName, adminEmail, adminName } = body as {
      churchName: string;
      adminEmail: string;
      adminName: string;
    };

    if (!churchName?.trim() || !adminEmail?.trim()) {
      return NextResponse.json({ error: "Nome da congregação e e-mail são obrigatórios." }, { status: 400 });
    }

    const existing = await db.establishment.findFirst({
      where: { name: { equals: churchName.trim(), mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ error: "Já existe uma congregação com este nome." }, { status: 409 });
    }

    const establishmentId = crypto.randomUUID();

    // Establishment e User não têm dependência entre si — rodam em paralelo
    const [, adminUser] = await Promise.all([
      db.establishment.create({
        data: { id: establishmentId, name: churchName.trim() },
      }),
      db.user.upsert({
        where: { email: adminEmail.trim() },
        update: {},
        create: {
          email: adminEmail.trim(),
          name: adminName?.trim() || adminEmail.trim(),
          role: "ADMIN",
          establishmentId,
        },
      }),
    ]);

    // Precisa dos IDs de ambos — vincula e semeia permissões em paralelo
    const permissionSeeds = [];
    for (const role of ["LEADER", "MEMBER"] as const) {
      for (const mod of MODULES) {
        for (const action of ACTIONS) {
          permissionSeeds.push({ role, module: mod, action, granted: false, establishmentId });
        }
      }
    }

    await Promise.all([
      db.userEstablishment.upsert({
        where: { userId_establishmentId: { userId: adminUser.id, establishmentId } },
        update: { role: "ADMIN" },
        create: { userId: adminUser.id, establishmentId, role: "ADMIN" },
      }),
      db.rolePermission.createMany({ data: permissionSeeds, skipDuplicates: true }),
      // E-mail não é crítico — dispara sem bloquear a resposta ao cliente
      sendWelcomeEmail({
        to: adminEmail.trim(),
        name: adminName?.trim() || "Pastor",
        churchName: churchName.trim(),
      }).catch((e) => console.error("[onboarding] e-mail falhou:", e)),
    ]);

    return NextResponse.json({ success: true, establishmentId });
  } catch (err) {
    console.error("[onboarding]", err);
    return NextResponse.json({ error: "Erro interno ao criar congregação." }, { status: 500 });
  }
}
