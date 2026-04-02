/**
 * Script de migração de dados: popula UserEstablishment a partir dos
 * campos legados User.establishmentId e User.role existentes.
 *
 * Executar uma vez: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/migrate-user-establishments.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!;
const adapter = new PrismaNeon({ connectionString });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, establishmentId: true, role: true },
  });

  console.log(`Encontrados ${users.length} usuários para migrar.`);

  let created = 0;
  let skipped = 0;

  for (const u of users) {
    if (!u.establishmentId) {
      console.log(`  ⚠ Usuário ${u.email} sem establishmentId — ignorado.`);
      skipped++;
      continue;
    }

    // Verifica se o Establishment existe
    const establishment = await prisma.establishment.findUnique({
      where: { id: u.establishmentId },
      select: { id: true },
    });

    if (!establishment) {
      console.log(`  ⚠ Establishment "${u.establishmentId}" não encontrado para ${u.email} — ignorado.`);
      skipped++;
      continue;
    }

    const result = await prisma.userEstablishment.upsert({
      where: { userId_establishmentId: { userId: u.id, establishmentId: u.establishmentId } },
      update: { role: u.role },
      create: { userId: u.id, establishmentId: u.establishmentId, role: u.role },
    });

    console.log(`  ✓ ${u.email} → ${u.establishmentId} [${u.role}] (id: ${result.id})`);
    created++;
  }

  console.log(`\nMigração concluída: ${created} vínculos criados, ${skipped} ignorados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
