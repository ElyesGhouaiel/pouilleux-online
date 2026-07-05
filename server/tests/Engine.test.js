const test = require("node:test");
const assert = require("node:assert");
const GameEngine = require("../game/Engine");

function makePlayers(count) {
  const base = [
    { id: 1, pseudo: "alice", isBot: false },
    { id: 2, pseudo: "bob", isBot: false },
    { id: 3, pseudo: "charlie", isBot: false },
    { id: 4, pseudo: "david", isBot: false },
  ];
  return base.slice(0, count);
}

test("start() distribue les cartes à tous les joueurs", () => {
  const engine = new GameEngine(makePlayers(3));
  engine.start();

  const totalCards = engine.players.reduce((sum, p) => sum + p.hand.length, 0);
  assert.ok(totalCards > 0);

  for (const p of engine.players) {
    assert.ok(p.hand.length > 0, `${p.pseudo} n'a pas de cartes`);
    assert.ok(p.hand.length <= 9, `${p.pseudo} a ${p.hand.length} cartes (max 9)`);
  }
});

test("start() démarre en phase prep", () => {
  const engine = new GameEngine(makePlayers(2));
  engine.start();
  assert.strictEqual(engine.phase, "prep");
});

test("markReady passe un joueur en prêt", () => {
  const engine = new GameEngine(makePlayers(2));
  engine.start();

  assert.strictEqual(engine.players[0].ready, false);
  engine.markReady(engine.players[0].id);
  assert.strictEqual(engine.players[0].ready, true);
});

test("allReady est vrai seulement quand tout le monde est prêt", () => {
  const engine = new GameEngine(makePlayers(3));
  engine.start();

  assert.strictEqual(engine.allReady(), false);
  engine.markReady(engine.players[0].id);
  assert.strictEqual(engine.allReady(), false);
  engine.markReady(engine.players[1].id);
  assert.strictEqual(engine.allReady(), false);
  engine.markReady(engine.players[2].id);
  assert.strictEqual(engine.allReady(), true);
});

test("startPlaying change la phase", () => {
  const engine = new GameEngine(makePlayers(2));
  engine.start();

  engine.startPlaying();
  assert.strictEqual(engine.phase, "playing");
});

test("discardPair fonctionne avec une vraie paire", () => {
  const engine = new GameEngine(makePlayers(2));
  engine.start();

  const player = engine.players[0];
  player.hand = [
    { id: 100, value: "roi", suit: "coeur" },
    { id: 101, value: "roi", suit: "pique" },
    { id: 102, value: "7", suit: "trefle" },
  ];

  const res = engine.discardPair(player.id, 100, 101);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(player.hand.length, 1);
  assert.strictEqual(engine.discardPile.length, 2);
});

test("discardPair refuse deux cartes qui ne sont pas une paire", () => {
  const engine = new GameEngine(makePlayers(2));
  engine.start();

  const player = engine.players[0];
  player.hand = [
    { id: 100, value: "roi", suit: "coeur" },
    { id: 101, value: "dame", suit: "pique" },
  ];

  const res = engine.discardPair(player.id, 100, 101);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(player.hand.length, 2);
});

test("discardPair refuse deux fois la même carte", () => {
  const engine = new GameEngine(makePlayers(2));
  engine.start();

  const player = engine.players[0];
  player.hand = [{ id: 100, value: "roi", suit: "coeur" }];

  const res = engine.discardPair(player.id, 100, 100);
  assert.strictEqual(res.ok, false);
});

test("drawCard refuse pendant la phase prep", () => {
  const engine = new GameEngine(makePlayers(2));
  engine.start();

  const res = engine.drawCard(engine.players[0].id, 0);
  assert.strictEqual(res.ok, false);
});

test("drawCard refuse si ce n'est pas le tour du joueur", () => {
  const engine = new GameEngine(makePlayers(2));
  engine.start();
  engine.startPlaying();

  const notCurrent = engine.players.find(
    (p) => p.id !== engine.getCurrentPlayer().id
  );
  const res = engine.drawCard(notCurrent.id, 0);
  assert.strictEqual(res.ok, false);
});

test("drawCard transfère une carte du voisin au joueur courant", () => {
  const engine = new GameEngine(makePlayers(2));
  engine.start();
  engine.startPlaying();

  const current = engine.getCurrentPlayer();
  const target = engine.getDrawTarget();
  const beforeCurrent = current.hand.length;
  const beforeTarget = target.hand.length;

  const res = engine.drawCard(current.id, 0);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(current.hand.length, beforeCurrent + 1);
  assert.strictEqual(target.hand.length, beforeTarget - 1);
});

test("drawCard change le tour après la pioche", () => {
  const engine = new GameEngine(makePlayers(3));
  engine.start();
  engine.startPlaying();

  const firstTurnId = engine.getCurrentPlayer().id;
  engine.drawCard(firstTurnId, 0);
  assert.notStrictEqual(engine.getCurrentPlayer().id, firstTurnId);
});

test("shuffleHand change l'ordre des cartes sans en perdre", () => {
  const engine = new GameEngine(makePlayers(2));
  engine.start();

  const player = engine.players[0];
  const before = [...player.hand];
  engine.shuffleHand(player.id);

  assert.strictEqual(player.hand.length, before.length);
  const beforeIds = before.map((c) => c.id).sort();
  const afterIds = player.hand.map((c) => c.id).sort();
  assert.deepStrictEqual(afterIds, beforeIds);
});

test("checkElimination marque un joueur sans cartes comme éliminé", () => {
  const engine = new GameEngine(makePlayers(3));
  engine.start();

  const player = engine.players[0];
  player.hand = [
    { id: 200, value: "roi", suit: "coeur" },
    { id: 201, value: "roi", suit: "pique" },
  ];

  engine.discardPair(player.id, 200, 201);
  assert.strictEqual(player.eliminated, true);
});

test("checkGameOver : le dernier joueur restant est le pouilleux", () => {
  const engine = new GameEngine(makePlayers(3));
  engine.start();

  engine.players[0].hand = [];
  engine.players[0].eliminated = true;
  engine.players[1].hand = [];
  engine.players[1].eliminated = true;

  engine.checkGameOver();
  assert.strictEqual(engine.finished, true);
  assert.strictEqual(engine.loser.id, engine.players[2].id);
});

test("getNextPlayerIndex saute les joueurs éliminés", () => {
  const engine = new GameEngine(makePlayers(4));
  engine.start();

  engine.players[1].eliminated = true;
  const next = engine.getNextPlayerIndex(0);
  assert.strictEqual(next, 2);
});

test("getStateForPlayer n'expose pas les mains des autres", () => {
  const engine = new GameEngine(makePlayers(3));
  engine.start();

  const meId = engine.players[0].id;
  const state = engine.getStateForPlayer(meId);

  for (const p of state.players) {
    if (p.id === meId) {
      assert.ok(Array.isArray(p.hand), "ma main doit être visible");
    } else {
      assert.strictEqual(p.hand, undefined, "je ne dois pas voir la main des autres");
    }
  }
});

test("getStateForPlayer expose le compteur de cartes pour tous", () => {
  const engine = new GameEngine(makePlayers(3));
  engine.start();

  const state = engine.getStateForPlayer(engine.players[0].id);
  for (const p of state.players) {
    assert.strictEqual(typeof p.cardCount, "number");
  }
});

test("forceDrawRandom fait piocher une carte au hasard", () => {
  const engine = new GameEngine(makePlayers(2));
  engine.start();
  engine.startPlaying();

  const current = engine.getCurrentPlayer();
  const before = current.hand.length;
  const res = engine.forceDrawRandom(current.id);

  assert.ok(res && res.ok);
  assert.strictEqual(current.hand.length, before + 1);
});
