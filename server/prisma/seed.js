const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // on vide les tables avant de re-seed
  await prisma.participation.deleteMany();
  await prisma.partie.deleteMany();
  await prisma.joueur.deleteMany();

  const hash = await bcrypt.hash("test1234", 10);

  const alice = await prisma.joueur.create({
    data: {
      pseudo: "alice",
      email: "alice@test.com",
      motDePasse: hash,
    },
  });

  const bob = await prisma.joueur.create({
    data: {
      pseudo: "bob",
      email: "bob@test.com",
      motDePasse: hash,
    },
  });

  const charlie = await prisma.joueur.create({
    data: {
      pseudo: "charlie",
      email: "charlie@test.com",
      motDePasse: hash,
    },
  });

  // une partie terminée
  const partie1 = await prisma.partie.create({
    data: {
      dateDebut: new Date("2026-03-25T14:00:00"),
      dateFin: new Date("2026-03-25T14:20:00"),
    },
  });

  // une partie en cours
  const partie2 = await prisma.partie.create({
    data: {
      dateDebut: new Date("2026-03-27T16:00:00"),
      dateFin: null,
    },
  });

  // participations
  await prisma.participation.createMany({
    data: [
      { joueurId: alice.id, partieId: partie1.id, estPerdant: false },
      { joueurId: bob.id, partieId: partie1.id, estPerdant: true },
      { joueurId: alice.id, partieId: partie2.id, estPerdant: false },
      { joueurId: charlie.id, partieId: partie2.id, estPerdant: false },
    ],
  });

  console.log("seed ok");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
