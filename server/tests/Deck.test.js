const test = require("node:test");
const assert = require("node:assert");
const { createDeck, shuffle, prepareDeck, isPair } = require("../game/Deck");

test("createDeck crée 52 cartes uniques", () => {
  const deck = createDeck();
  assert.strictEqual(deck.length, 52);

  const ids = new Set(deck.map((c) => c.id));
  assert.strictEqual(ids.size, 52);
});

test("createDeck contient 4 cartes pour chaque valeur", () => {
  const deck = createDeck();
  const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "valet", "dame", "roi", "as"];

  for (const v of values) {
    const count = deck.filter((c) => c.value === v).length;
    assert.strictEqual(count, 4, `valeur ${v} devrait avoir 4 cartes, a ${count}`);
  }
});

test("shuffle ne perd aucune carte", () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const shuffled = shuffle(original);

  assert.strictEqual(shuffled.length, 10);
  assert.deepStrictEqual([...shuffled].sort((a, b) => a - b), original);
});

test("shuffle ne modifie pas le tableau d'origine", () => {
  const original = [1, 2, 3, 4, 5];
  const copy = [...original];
  shuffle(original);
  assert.deepStrictEqual(original, copy);
});

test("isPair reconnaît une paire", () => {
  assert.strictEqual(isPair({ value: "roi", suit: "coeur" }, { value: "roi", suit: "pique" }), true);
  assert.strictEqual(isPair({ value: "7", suit: "coeur" }, { value: "7", suit: "carreau" }), true);
});

test("isPair refuse deux cartes différentes", () => {
  assert.strictEqual(isPair({ value: "roi", suit: "coeur" }, { value: "dame", suit: "coeur" }), false);
  assert.strictEqual(isPair({ value: "2", suit: "pique" }, { value: "3", suit: "pique" }), false);
});

test("prepareDeck respecte max 9 cartes par joueur", () => {
  for (const players of [2, 3, 4]) {
    const { deck } = prepareDeck(players);
    const maxPossible = players * 9;
    assert.ok(deck.length <= maxPossible, `${players} joueurs : ${deck.length} > ${maxPossible}`);
  }
});

test("prepareDeck renvoie un total impair de cartes", () => {
  // pour qu'il reste exactement une carte sans paire (le pouilleux)
  for (const players of [2, 3, 4]) {
    const { deck } = prepareDeck(players);
    assert.strictEqual(deck.length % 2, 1, `${players} joueurs : total pair`);
  }
});

test("prepareDeck contient exactement une carte sans paire", () => {
  for (const players of [2, 3, 4]) {
    const { deck } = prepareDeck(players);

    const countByValue = {};
    for (const card of deck) {
      countByValue[card.value] = (countByValue[card.value] || 0) + 1;
    }

    const lonely = Object.entries(countByValue).filter(([, n]) => n % 2 === 1);
    assert.strictEqual(lonely.length, 1, `${players} joueurs : ${lonely.length} cartes solo`);
  }
});

test("prepareDeck : le pouilleux est bien un as", () => {
  for (const players of [2, 3, 4]) {
    const { pouilleux } = prepareDeck(players);
    assert.strictEqual(pouilleux.value, "as");
  }
});

test("prepareDeck : bonne variété de valeurs (pas juste 3 valeurs répétées)", () => {
  // avant le fix : pour 2 joueurs on tombait sur 3 valeurs × 4 couleurs.
  // maintenant on veut au moins autant de valeurs différentes que de paires
  // (limité par les 12 valeurs non-as dispos).
  for (const players of [2, 3, 4]) {
    const { deck } = prepareDeck(players);
    const pairsNeeded = (deck.length - 1) / 2;
    const distinctValues = new Set(deck.map((c) => c.value));

    // paires + 1 pouilleux, borné par 13 (12 valeurs non-as + l'as)
    const expected = Math.min(13, pairsNeeded + 1);
    assert.ok(
      distinctValues.size >= expected,
      `${players} joueurs : ${distinctValues.size} valeurs distinctes, ${expected} attendues`
    );
  }
});
