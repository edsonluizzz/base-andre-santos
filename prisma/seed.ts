import "dotenv/config";
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

async function main() {
  console.log("Seeding members...");
  await prisma.member.deleteMany();
  await prisma.member.createMany({
    data: members.map((m) => ({
      name: m.name,
      birthday: m.birthday ?? undefined,
      status: "ACTIVE",
    })),
  });
  console.log(`Done — ${members.length} members seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
