import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const members = [
  { name: "Abimael", birthday: "28/12", phone: null },
  { name: "Alana Silva De Oliveira", birthday: "16/12", phone: null },
  { name: "Alessandra Caroline", birthday: "01/08", phone: null },
  { name: "Alex Sales Martins", birthday: "17/03", phone: null },
  { name: "Andre França Fonseca", birthday: "18/01", phone: null },
  { name: "Andressa Sales Martins", birthday: "30/05", phone: null },
  { name: "Anny", birthday: "25/09", phone: null },
  { name: "Bruna Marques", birthday: "23/10", phone: null },
  { name: "Cristina", birthday: "14/06", phone: null },
  { name: "Cyntia", birthday: "19/12", phone: null },
  { name: "Daniel Borge Sales", birthday: "16/11", phone: null },
  { name: "Diovana Ribeiro", birthday: "19/05", phone: null },
  { name: "Edson Luiz da Silva", birthday: "07/09", phone: null },
  { name: "Evander", birthday: "23/11", phone: null },
  { name: "Gabriela", birthday: "23/02", phone: null },
  { name: "Giovanna", birthday: "10/06", phone: null },
  { name: "Giulia Felix Gonçalves Godoy", birthday: "06/10", phone: null },
  { name: "Grazi", birthday: "15/04", phone: null },
  { name: "Hellen", birthday: "28/06", phone: null },
  { name: "Ingrid", birthday: "09/06", phone: null },
  { name: "Jean", birthday: "31/03", phone: null },
  { name: "Jessica Caroline Andrioli", birthday: "07/12", phone: null },
  { name: "Jô", birthday: "17/06", phone: null },
  { name: "João Victor Ferreira", birthday: "19/02", phone: null },
  { name: "Kamille", birthday: "19/12", phone: null },
  { name: "Kauana", birthday: "18/10", phone: null },
  { name: "Khevin", birthday: "08/08", phone: null },
  { name: "Lucas Camargo", birthday: "22/10", phone: null },
  { name: "Lucas Diego", birthday: null, phone: null },
  { name: "Luciana De Jesus De Sousa", birthday: "05/08", phone: null },
  { name: "Marcelo", birthday: "27/11", phone: null },
  { name: "Max", birthday: null, phone: null },
  { name: "Mayko Espirito Santo", birthday: "09/12", phone: null },
  { name: "Miriã Pereira De Morais", birthday: "27/05", phone: null },
  { name: "Pedro Henrique", birthday: "24/11", phone: null },
  { name: "Pr Ailton", birthday: "11/11", phone: null },
  { name: "Pra Néia", birthday: "18/09", phone: null },
  { name: "Rafael Foice", birthday: "19/08", phone: null },
  { name: "Rafinha", birthday: null, phone: null },
  { name: "Raphaelee", birthday: "21/10", phone: null },
  { name: "Ronaldo", birthday: "13/08", phone: null },
  { name: "Taiwan", birthday: "20/03", phone: null },
  { name: "Thaiane", birthday: "23/03", phone: null },
  { name: "Thainan Crystian Moraes", birthday: "14/10", phone: null },
  { name: "Vitor", birthday: "03/12", phone: null },
  { name: "Viviane", birthday: "07/04", phone: null },
  { name: "Wagner", birthday: "18/08", phone: null },
];

async function main() {
  console.log("🌱 Seeding members...");
  for (const m of members) {
    await prisma.member.upsert({
      where: { id: m.name }, // temp, will use name as key
      update: {},
      create: {
        name: m.name,
        birthday: m.birthday ?? undefined,
        phone: m.phone ?? undefined,
      },
    });
  }
  // Use createMany for simplicity (no upsert needed for fresh DB)
  await prisma.member.deleteMany();
  await prisma.member.createMany({
    data: members.map((m) => ({
      name: m.name,
      birthday: m.birthday ?? undefined,
      phone: m.phone ?? undefined,
    })),
  });
  console.log(`✅ ${members.length} members seeded.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
