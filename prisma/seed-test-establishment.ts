import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!;
const adapter = new PrismaNeon({ connectionString });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

const EID = "test-umadc-itapema";

async function main() {
  // ── Establishment ──────────────────────────────────────────────────────────
  console.log("Criando estabelecimento de teste: UMADC Itapema...");
  await prisma.establishment.upsert({
    where: { id: EID },
    update: {},
    create: { id: EID, name: "UMADC Itapema" },
  });

  // ── Membros fictícios ──────────────────────────────────────────────────────
  console.log("Inserindo membros fictícios...");
  const membrosData = [
    { name: "Lucas Ferreira", birthday: "12/03", phone: "47991110001" },
    { name: "Ana Paula Souza", birthday: "05/07", phone: "47991110002" },
    { name: "Matheus Costa", birthday: "22/11", phone: "47991110003" },
    { name: "Juliana Ramos", birthday: "30/01", phone: "47991110004" },
    { name: "Pedro Henrique Lima", birthday: "18/09", phone: "47991110005" },
    { name: "Camila Oliveira", birthday: "07/04", phone: "47991110006" },
    { name: "Rafael Souza", birthday: "14/06", phone: "47991110007" },
    { name: "Larissa Martins", birthday: "29/10", phone: "47991110008" },
    { name: "Bruno Alves", birthday: "03/12", phone: "47991110009" },
    { name: "Fernanda Castro", birthday: "16/08", phone: "47991110010" },
  ];

  const membros = await Promise.all(
    membrosData.map((m) =>
      prisma.member.upsert({
        where: { id: `${EID}-${m.name.toLowerCase().replace(/\s+/g, "-")}` },
        update: {},
        create: {
          id: `${EID}-${m.name.toLowerCase().replace(/\s+/g, "-")}`,
          name: m.name,
          birthday: m.birthday,
          phone: m.phone,
          status: "ACTIVE",
          establishmentId: EID,
        },
      })
    )
  );
  console.log(`${membros.length} membros criados.`);

  // ── Eventos ───────────────────────────────────────────────────────────────
  console.log("Inserindo eventos fictícios...");
  const agora = new Date();
  const eventos = await Promise.all([
    prisma.event.upsert({
      where: { id: `${EID}-evento-1` },
      update: {},
      create: {
        id: `${EID}-evento-1`,
        title: "Culto de Celebração",
        type: "CULTO",
        date: new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 7),
        location: "Igreja sede Itapema",
        establishmentId: EID,
      },
    }),
    prisma.event.upsert({
      where: { id: `${EID}-evento-2` },
      update: {},
      create: {
        id: `${EID}-evento-2`,
        title: "Ensaio do louvor",
        type: "ENSAIO",
        date: new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 3),
        location: "Salão de ensaios",
        establishmentId: EID,
      },
    }),
    prisma.event.upsert({
      where: { id: `${EID}-evento-3` },
      update: {},
      create: {
        id: `${EID}-evento-3`,
        title: "Reunião de líderes",
        type: "REUNIAO",
        date: new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 5),
        location: "Sala de reuniões",
        establishmentId: EID,
      },
    }),
  ]);
  console.log(`${eventos.length} eventos criados.`);

  // ── Chamadas para os 2 eventos passados ──────────────────────────────────
  console.log("Inserindo chamadas fictícias...");
  const statusOptions = ["PRESENT", "ABSENT", "PRESENT", "PRESENT", "ABSENT"] as const;
  for (const evento of [eventos[0], eventos[1]]) {
    for (let i = 0; i < membros.length; i++) {
      await prisma.attendance.upsert({
        where: { eventId_memberId: { eventId: evento.id, memberId: membros[i].id } },
        update: {},
        create: {
          eventId: evento.id,
          memberId: membros[i].id,
          status: statusOptions[i % statusOptions.length],
        },
      });
    }
  }
  console.log("Chamadas inseridas.");

  // ── Financeiro ────────────────────────────────────────────────────────────
  console.log("Inserindo dados financeiros fictícios...");
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
  for (let i = 0; i < 5; i++) {
    await prisma.offering.create({
      data: {
        memberId: membros[i].id,
        amount: [50, 80, 120, 30, 70][i],
        method: i % 2 === 0 ? "PIX" : "CASH",
        date: new Date(`${mesAtual}-${String(i + 5).padStart(2, "0")}`),
        establishmentId: EID,
      },
    });
  }
  await prisma.expense.create({
    data: {
      description: "Material de louvor",
      amount: 150,
      category: "MATERIAL",
      establishmentId: EID,
    },
  });
  console.log("Dados financeiros inseridos.");

  // ── Congresso ─────────────────────────────────────────────────────────────
  console.log("Inserindo congresso fictício...");
  const congress = await prisma.congress.upsert({
    where: { id: `${EID}-congress-1` },
    update: {},
    create: {
      id: `${EID}-congress-1`,
      name: "Congresso Itapema 2026",
      date: new Date(agora.getFullYear(), agora.getMonth() + 2, 15),
      location: "Centro de Eventos",
      description: "Congresso anual da UMADC Itapema",
      status: "OPEN",
      shirtPricing: { P: 60, M: 60, G: 65, GG: 70 },
      establishmentId: EID,
    },
  });

  for (let i = 0; i < 4; i++) {
    await prisma.shirtOrder.upsert({
      where: { congressId_memberId: { congressId: congress.id, memberId: membros[i].id } },
      update: {},
      create: {
        congressId: congress.id,
        memberId: membros[i].id,
        size: ["P", "M", "G", "GG"][i] as "P" | "M" | "G" | "GG",
        quantity: 1,
        totalAmount: [60, 60, 65, 70][i],
        paidAmount: i < 2 ? [60, 60][i] : 0,
        status: i < 2 ? "PAID" : "PENDING",
      },
    });
  }
  console.log("Congresso e pedidos inseridos.");

  // ── Permissões ────────────────────────────────────────────────────────────
  console.log("Inserindo permissões padrão para Itapema...");
  const defaultPerms = [
    { role: "LEADER", module: "MEMBERS",    action: "VIEW",   granted: true  },
    { role: "LEADER", module: "MEMBERS",    action: "CREATE", granted: true  },
    { role: "LEADER", module: "MEMBERS",    action: "EDIT",   granted: true  },
    { role: "LEADER", module: "ATTENDANCE", action: "VIEW",   granted: true  },
    { role: "LEADER", module: "ATTENDANCE", action: "CREATE", granted: true  },
    { role: "LEADER", module: "FINANCIAL",  action: "VIEW",   granted: true  },
    { role: "LEADER", module: "REPORTS",    action: "VIEW",   granted: true  },
    { role: "LEADER", module: "SHIRTS",     action: "VIEW",   granted: true  },
    { role: "MEMBER", module: "ATTENDANCE", action: "VIEW",   granted: true  },
    { role: "MEMBER", module: "BIRTHDAYS",  action: "VIEW",   granted: true  },
  ] as const;

  for (const p of defaultPerms) {
    await prisma.rolePermission.upsert({
      where: {
        role_module_action_establishmentId: {
          role: p.role,
          module: p.module,
          action: p.action,
          establishmentId: EID,
        },
      },
      update: {},
      create: {
        role: p.role,
        module: p.module,
        action: p.action,
        granted: p.granted,
        establishmentId: EID,
      },
    });
  }
  console.log("Permissões inseridas.");

  console.log(`\nConcluído! Estabelecimento "${EID}" pronto para testes.`);
  console.log("Para testar: faça login com um e-mail e mude o establishmentId do usuário para 'test-umadc-itapema' direto no banco ou via /configuracoes.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
