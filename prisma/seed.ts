import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  await db.campaign.upsert({
    where: { id: "andre-santos-2026" },
    update: {},
    create: {
      id: "andre-santos-2026",
      name: "Base Andre Santos",
      joinCode: "andre2026",
    },
  });

  await db.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", campaignName: "Base Andre Santos", updatedAt: new Date() },
  });

  console.log("Seed concluido: Campaign criada");
}

main().catch(console.error).finally(() => db.$disconnect());
