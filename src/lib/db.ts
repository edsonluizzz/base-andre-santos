import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Prisma 7 exige options não-vazias na construção — `new PrismaClient()`
    // lança PrismaClientInitializationError e quebrava o build de CI sem banco
    // (Collecting page data). URL placeholder: o pg Pool só conecta na 1ª
    // query, que nunca acontece num build sem banco (rotas são dinâmicas).
    const adapter = new PrismaPg({
      connectionString: "postgresql://offline:offline@localhost:5432/offline",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({ adapter } as any);
  }
  // O driver Neon serverless só fala com o proxy da Neon (WebSocket/HTTP) —
  // Postgres comum (CI/E2E, dev local) precisa do adapter pg padrão.
  const isNeon = /neon\.tech/i.test(connectionString);
  const adapter = isNeon
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

export const db = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}
