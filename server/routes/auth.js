const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/register
router.post("/register", async (req, res) => {
  try {
    const { pseudo, email, password } = req.body;

    if (!pseudo || !email || !password) {
      return res.status(400).json({ error: "il manque des champs" });
    }

    const existe = await prisma.joueur.findUnique({ where: { email } });
    if (existe) {
      return res.status(409).json({ error: "cet email est déjà pris" });
    }

    const hash = await bcrypt.hash(password, 10);

    const joueur = await prisma.joueur.create({
      data: {
        pseudo,
        email,
        motDePasse: hash,
      },
    });

    res.status(201).json({
      id: joueur.id,
      pseudo: joueur.pseudo,
      email: joueur.email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "erreur serveur" });
  }
});

// POST /api/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "il manque des champs" });
    }

    const joueur = await prisma.joueur.findUnique({ where: { email } });
    if (!joueur) {
      return res.status(404).json({ error: "compte introuvable" });
    }

    const ok = await bcrypt.compare(password, joueur.motDePasse);
    if (!ok) {
      return res.status(401).json({ error: "mauvais mot de passe" });
    }

    const token = jwt.sign(
      { id: joueur.id, pseudo: joueur.pseudo },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ token, pseudo: joueur.pseudo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "erreur serveur" });
  }
});

module.exports = router;
