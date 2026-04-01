import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fallback to .env
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!;
const adapter = new PrismaNeon({ connectionString });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

const members = [
  { name: "Abimael", birthday: "28/12" },
  { name: "Alana Silva De Oliveira", birthday: "16/12" },
  { name: "Alessandra Caroline", birthday: "01/08" },
  { name: "Alex Sales Martins", birthday: "17/03" },
  { name: "Andre França Fonseca", birthday: "18/01" },
  { name: "Andressa Sales Martins", birthday: "30/05" },
  { name: "Anny", birthday: "25/09" },
  { name: "Bruna Marques", birthday: "23/10" },
  { name: "Cristina", birthday: "14/06" },
  { name: "Cyntia", birthday: "19/12" },
  { name: "Daniel Borge Sales", birthday: "16/11" },
  { name: "Diovana Ribeiro", birthday: "19/05" },
  { name: "Edson Luiz da Silva", birthday: "07/09" },
  { name: "Evander", birthday: "23/11" },
  { name: "Gabriela", birthday: "23/02" },
  { name: "Giovanna", birthday: "10/06" },
  { name: "Giulia Felix Gonçalves Godoy", birthday: "06/10" },
  { name: "Grazi", birthday: "15/04" },
  { name: "Hellen", birthday: "28/06" },
  { name: "Ingrid", birthday: "09/06" },
  { name: "Jean", birthday: "31/03" },
  { name: "Jessica Caroline Andrioli", birthday: "07/12" },
  { name: "Jô", birthday: "17/06" },
  { name: "João Victor Ferreira", birthday: "19/02" },
  { name: "Kamille", birthday: "19/12" },
  { name: "Kauana", birthday: "18/10" },
  { name: "Khevin", birthday: "08/08" },
  { name: "Lucas Camargo", birthday: "22/10" },
  { name: "Lucas Diego", birthday: null },
  { name: "Luciana De Jesus De Sousa", birthday: "05/08" },
  { name: "Marcelo", birthday: "27/11" },
  { name: "Max", birthday: null },
  { name: "Mayko Espirito Santo", birthday: "09/12" },
  { name: "Miriã Pereira De Morais", birthday: "27/05" },
  { name: "Pedro Henrique", birthday: "24/11" },
  { name: "Pr Ailton", birthday: "11/11" },
  { name: "Pra Néia", birthday: "18/09" },
  { name: "Rafael Foice", birthday: "19/08" },
  { name: "Rafinha", birthday: null },
  { name: "Raphaelee", birthday: "21/10" },
  { name: "Ronaldo", birthday: "13/08" },
  { name: "Taiwan", birthday: "20/03" },
  { name: "Thaiane", birthday: "23/03" },
  { name: "Thainan Crystian Moraes", birthday: "14/10" },
  { name: "Vitor", birthday: "03/12" },
  { name: "Viviane", birthday: "07/04" },
  { name: "Wagner", birthday: "18/08" },
];

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
] as const;

async function main() {
  // ── Establishment padrão (Porto Belo) ──────────────────────────────────────
  console.log("Seeding establishment padrão...");
  await prisma.establishment.upsert({
    where: { id: "default-porto-belo" },
    update: {},
    create: { id: "default-porto-belo", name: "Porto Belo" },
  });
  console.log("Done — establishment 'default-porto-belo' garantido.");

  // ── Membros ────────────────────────────────────────────────────────────────
  console.log("Seeding members (só adiciona novos — não apaga dados existentes)...");
  const existingNames = new Set(
    (await prisma.member.findMany({ select: { name: true } })).map((m) => m.name)
  );
  const toCreate = members.filter((m) => !existingNames.has(m.name));
  if (toCreate.length > 0) {
    await prisma.member.createMany({
      data: toCreate.map((m) => ({
        name: m.name,
        birthday: m.birthday ?? undefined,
        status: "ACTIVE",
      })),
    });
    console.log(`Done — ${toCreate.length} novos membros adicionados.`);
  } else {
    console.log("Nenhum membro novo para adicionar.");
  }

  // ── Permissões padrão ──────────────────────────────────────────────────────
  console.log("Seeding default permissions...");
  for (const p of defaultPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_module_action_establishmentId: {
          role: p.role as "LEADER" | "MEMBER",
          module: p.module as "MEMBERS" | "ATTENDANCE" | "FINANCIAL" | "REPORTS" | "EVENTS" | "BIRTHDAYS" | "SHIRTS" | "SETTINGS" | "USERS",
          action: p.action as "VIEW" | "CREATE" | "EDIT" | "DELETE" | "EXPORT",
          establishmentId: "default-porto-belo",
        },
      },
      update: { granted: p.granted },
      create: {
        role: p.role as "LEADER" | "MEMBER",
        module: p.module as "MEMBERS" | "ATTENDANCE" | "FINANCIAL" | "REPORTS" | "EVENTS" | "BIRTHDAYS" | "SHIRTS" | "SETTINGS" | "USERS",
        action: p.action as "VIEW" | "CREATE" | "EDIT" | "DELETE" | "EXPORT",
        granted: p.granted,
        establishmentId: "default-porto-belo",
      },
    });
  }
  console.log(`Done — ${defaultPermissions.length} permission records seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
