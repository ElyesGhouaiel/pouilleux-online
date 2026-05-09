const express = require("express");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// POST /api/ai/chat
router.post("/chat", authMiddleware, async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message manquant" });
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "IA non configurée" });
    }

    const systemPrompt = `Tu es un assistant pour le jeu de cartes "Le Pouilleux" (Old Maid).
Tu aides le joueur en donnant des conseils stratégiques courts et sympas, comme un pote qui connaît bien le jeu.
Règles du jeu :
- 2 à 4 joueurs, 51 cartes (un as retiré au hasard = le pouilleux)
- Chaque tour, le joueur courant pioche une carte chez son voisin
- Le but c'est de défausser toutes ses paires (2 cartes de même valeur)
- Celui qui reste avec le pouilleux (as solitaire) à la fin a perdu

Réponds en français, de façon courte (2-3 phrases max), sans formater avec des titres ou des listes.`;

    const userPrompt = context
      ? `Contexte actuel :\n${context}\n\nQuestion du joueur : ${message}`
      : message;

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("erreur Mistral:", errText);
      return res.status(502).json({ error: "erreur appel IA" });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "pas de réponse";

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "erreur serveur" });
  }
});

module.exports = router;
