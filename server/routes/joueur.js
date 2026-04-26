const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const joueur = await prisma.joueur.findUnique({
      where: { id: req.user.id },
      select: { id: true, pseudo: true, email: true, dateInscription: true },
    });

    if (!joueur) {
      return res.status(404).json({ error: "joueur introuvable" });
    }

    res.json(joueur);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "erreur serveur" });
  }
});

// GET /api/history
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const participations = await prisma.participation.findMany({
      where: { joueurId: req.user.id },
      include: {
        partie: true,
      },
      orderBy: { partie: { dateDebut: "desc" } },
    });

    const history = participations.map((p) => ({
      partieId: p.partieId,
      dateDebut: p.partie.dateDebut,
      dateFin: p.partie.dateFin,
      estPerdant: p.estPerdant,
      enCours: p.partie.dateFin === null,
    }));

    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "erreur serveur" });
  }
});

module.exports = router;
