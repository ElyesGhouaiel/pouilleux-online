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

const MAX_CARDS_PER_PLAYER = 7;

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

  // on mélange l'ordre des valeurs pour pas toujours avoir les mêmes cartes
  const values = shuffle(Object.keys(byValue));
  let added = 0;

  for (const val of values) {
    const cards = byValue[val];
    // on peut prendre 1 ou 2 paires par valeur (2 de chaque couleur)
    if (added < pairsNeeded) {
      selected.push(cards[0], cards[1]);
      added++;
    }
    if (added < pairsNeeded) {
      selected.push(cards[2], cards[3]);
      added++;
    }
    if (added === pairsNeeded) break;
  }

  return { deck: shuffle(selected), pouilleux: loneAce };
}

function isPair(card1, card2) {
  return card1.value === card2.value;
}

module.exports = { createDeck, shuffle, prepareDeck, isPair };
