const SUITS = ["coeur", "carreau", "pique", "trefle"];
const VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "valet", "dame", "roi", "as"];

function createDeck() {
  const cards = [];
  let id = 0;

  for (const suit of SUITS) {
    for (const value of VALUES) {
      cards.push({ id: id++, value, suit });
    }
  }

  return cards;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MAX_CARDS_PER_PLAYER = 9;

function prepareDeck(playerCount = 2) {
  const fullDeck = createDeck();

  // total de cartes = max 7 par joueur, et doit rester impair
  // pour qu'il reste un as solo (le pouilleux)
  let target = playerCount * MAX_CARDS_PER_PLAYER;
  if (target % 2 === 0) target -= 1;

  // on prend un as au hasard -> ce sera le pouilleux (sans paire)
  const aces = fullDeck.filter((c) => c.value === "as");
  const loneAce = aces[Math.floor(Math.random() * aces.length)];

  // on regroupe les autres cartes par valeur pour pouvoir piocher des paires
  const nonAces = fullDeck.filter((c) => c.value !== "as");
  const byValue = {};
  for (const c of nonAces) {
    if (!byValue[c.value]) byValue[c.value] = [];
    byValue[c.value].push(c);
  }

  const selected = [loneAce];
  const pairsNeeded = (target - 1) / 2;
  let added = 0;

  // pour chaque valeur on prépare ses 2 paires possibles avec des couleurs mélangées
  // (comme ça on n'a pas toujours coeur+carreau pour la 1re paire de chaque valeur)
  const pairsByValue = {};
  for (const val of Object.keys(byValue)) {
    const suits = shuffle(byValue[val]);
    pairsByValue[val] = [
      [suits[0], suits[1]],
      [suits[2], suits[3]],
    ];
  }

  // ordre des valeurs mélangé pour varier d'une partie à l'autre
  const values = shuffle(Object.keys(byValue));

  // 1er passage : une seule paire par valeur.
  // Ça garantit un max de valeurs différentes dans la partie
  // (au lieu de piocher toutes les couleurs de 3 valeurs comme avant).
  for (const val of values) {
    if (added >= pairsNeeded) break;
    const [c1, c2] = pairsByValue[val][0];
    selected.push(c1, c2);
    added++;
  }

  // 2e passage seulement si on a besoin de plus de paires que de valeurs dispos
  // (cas d'une partie à 4 joueurs par ex)
  for (const val of values) {
    if (added >= pairsNeeded) break;
    const [c1, c2] = pairsByValue[val][1];
    selected.push(c1, c2);
    added++;
  }

  return { deck: shuffle(selected), pouilleux: loneAce };
}

function isPair(card1, card2) {
  return card1.value === card2.value;
}

module.exports = { createDeck, shuffle, prepareDeck, isPair };
