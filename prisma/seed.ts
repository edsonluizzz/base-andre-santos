import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!;
const adapter = new PrismaNeon({ connectionString });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

// Membros removidos do seed — o banco de Porto Belo já contém os dados reais.
// Rodar o seed nunca deve recriar membros deletados ou renomeados.

// Default permission grants for LEADER and MEMBER roles.
// ADMIN always has full access and is not stored in this table.
const defaultPermissions = [
  // MEMBERS
  { role: "LEADER", module: "MEMBERS", action: "VIEW", granted: true },
  { role: "LEADER", module: "MEMBERS", action: "CREATE", granted: true },
  { role: "LEADER", module: "MEMBERS", action: "EDIT", granted: true },
  { role: "LEADER", module: "MEMBERS", action: "DELETE", granted: false },
  { role: "MEMBER", module: "MEMBERS", action: "VIEW", granted: false },
  { role: "MEMBER", module: "MEMBERS", action: "CREATE", granted: false },
  { role: "MEMBER", module: "MEMBERS", action: "EDIT", granted: false },
  { role: "MEMBER", module: "MEMBERS", action: "DELETE", granted: false },
  // ATTENDANCE
  { role: "LEADER", module: "ATTENDANCE", action: "VIEW", granted: true },
  { role: "LEADER", module: "ATTENDANCE", action: "CREATE", granted: true },
  { role: "LEADER", module: "ATTENDANCE", action: "EDIT", granted: true },
  { role: "LEADER", module: "ATTENDANCE", action: "DELETE", granted: false },
  { role: "MEMBER", module: "ATTENDANCE", action: "VIEW", granted: true },
  { role: "MEMBER", module: "ATTENDANCE", action: "CREATE", granted: false },
  { role: "MEMBER", module: "ATTENDANCE", action: "EDIT", granted: false },
  { role: "MEMBER", module: "ATTENDANCE", action: "DELETE", granted: false },
  // FINANCIAL
  { role: "LEADER", module: "FINANCIAL", action: "VIEW", granted: true },
  { role: "LEADER", module: "FINANCIAL", action: "CREATE", granted: true },
  { role: "LEADER", module: "FINANCIAL", action: "EDIT", granted: true },
  { role: "LEADER", module: "FINANCIAL", action: "DELETE", granted: false },
  { role: "MEMBER", module: "FINANCIAL", action: "VIEW", granted: false },
  { role: "MEMBER", module: "FINANCIAL", action: "CREATE", granted: false },
  { role: "MEMBER", module: "FINANCIAL", action: "EDIT", granted: false },
  { role: "MEMBER", module: "FINANCIAL", action: "DELETE", granted: false },
  // REPORTS
  { role: "LEADER", module: "REPORTS", action: "VIEW", granted: true },
  { role: "LEADER", module: "REPORTS", action: "EXPORT", granted: true },
  { role: "MEMBER", module: "REPORTS", action: "VIEW", granted: false },
  { role: "MEMBER", module: "REPORTS", action: "EXPORT", granted: false },
  // EVENTS
  { role: "LEADER", module: "EVENTS", action: "VIEW", granted: true },
  { role: "LEADER", module: "EVENTS", action: "CREATE", granted: true },
  { role: "LEADER", module: "EVENTS", action: "EDIT", granted: true },
  { role: "LEADER", module: "EVENTS", action: "DELETE", granted: false },
  { role: "MEMBER", module: "EVENTS", action: "VIEW", granted: true },
  { role: "MEMBER", module: "EVENTS", action: "CREATE", granted: false },
  { role: "MEMBER", module: "EVENTS", action: "EDIT", granted: false },
  { role: "MEMBER", module: "EVENTS", action: "DELETE", granted: false },
  // BIRTHDAYS
  { role: "LEADER", module: "BIRTHDAYS", action: "VIEW", granted: true },
  { role: "MEMBER", module: "BIRTHDAYS", action: "VIEW", granted: true },
  // SHIRTS
  { role: "LEADER", module: "SHIRTS", action: "VIEW", granted: true },
  { role: "LEADER", module: "SHIRTS", action: "CREATE", granted: true },
  { role: "LEADER", module: "SHIRTS", action: "EDIT", granted: true },
  { role: "LEADER", module: "SHIRTS", action: "DELETE", granted: false },
  { role: "LEADER", module: "SHIRTS", action: "EXPORT", granted: true },
  { role: "MEMBER", module: "SHIRTS", action: "VIEW", granted: true },
  { role: "MEMBER", module: "SHIRTS", action: "CREATE", granted: false },
  { role: "MEMBER", module: "SHIRTS", action: "EDIT", granted: false },
  { role: "MEMBER", module: "SHIRTS", action: "DELETE", granted: false },
  { role: "MEMBER", module: "SHIRTS", action: "EXPORT", granted: false },
  // SETTINGS
  { role: "LEADER", module: "SETTINGS", action: "VIEW", granted: false },
  { role: "LEADER", module: "SETTINGS", action: "EDIT", granted: false },
  { role: "MEMBER", module: "SETTINGS", action: "VIEW", granted: false },
  { role: "MEMBER", module: "SETTINGS", action: "EDIT", granted: false },
  // USERS
  { role: "LEADER", module: "USERS", action: "VIEW", granted: false },
  { role: "LEADER", module: "USERS", action: "EDIT", granted: false },
  { role: "MEMBER", module: "USERS", action: "VIEW", granted: false },
  { role: "MEMBER", module: "USERS", action: "EDIT", granted: false },
  // MINISTRIES
  { role: "LEADER", module: "MINISTRIES", action: "VIEW", granted: true },
  { role: "LEADER", module: "MINISTRIES", action: "CREATE", granted: true },
  { role: "LEADER", module: "MINISTRIES", action: "EDIT", granted: true },
  { role: "LEADER", module: "MINISTRIES", action: "DELETE", granted: false },
  { role: "MEMBER", module: "MINISTRIES", action: "VIEW", granted: false },
  { role: "MEMBER", module: "MINISTRIES", action: "CREATE", granted: false },
  { role: "MEMBER", module: "MINISTRIES", action: "EDIT", granted: false },
  { role: "MEMBER", module: "MINISTRIES", action: "DELETE", granted: false },
] as const;

async function main() {
  console.log("Seeding establishment padrão (Porto Belo)...");
  await prisma.establishment.upsert({
    where: { id: "default-porto-belo" },
    update: {},
    create: { id: "default-porto-belo", name: "UMADC Porto Belo" },
  });
  console.log("Done — establishment padrão garantido.");

  console.log("Seeding default permissions...");
  for (const p of defaultPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_module_action_establishmentId: {
          role: p.role as "LEADER" | "MEMBER",
          module: p.module as "MEMBERS" | "ATTENDANCE" | "FINANCIAL" | "REPORTS" | "EVENTS" | "BIRTHDAYS" | "SHIRTS" | "SETTINGS" | "USERS" | "MINISTRIES",
          action: p.action as "VIEW" | "CREATE" | "EDIT" | "DELETE" | "EXPORT",
          establishmentId: "default-porto-belo",
        },
      },
      update: { granted: p.granted },
      create: {
        role: p.role as "LEADER" | "MEMBER",
        module: p.module as "MEMBERS" | "ATTENDANCE" | "FINANCIAL" | "REPORTS" | "EVENTS" | "BIRTHDAYS" | "SHIRTS" | "SETTINGS" | "USERS" | "MINISTRIES",
        action: p.action as "VIEW" | "CREATE" | "EDIT" | "DELETE" | "EXPORT",
        granted: p.granted,
      },
    });
  }
  console.log(`Done — ${defaultPermissions.length} permission records seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
