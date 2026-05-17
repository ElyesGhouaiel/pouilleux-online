const test = require("node:test");
const assert = require("node:assert");
const GameEngine = require("../game/Engine");
const Bot = require("../game/Bot");

function makeEngineWithBot() {
  const engine = new GameEngine([
    { id: 1, pseudo: "alice", isBot: false },
    { id: -1, pseudo: "Bot 1", isBot: true },
  ]);
  engine.start();
  const bot = new Bot(engine, -1, () => {});
  return { engine, bot };
}

test("discardAllPairs défausse toutes les paires du bot", async () => {
  const { engine, bot } = makeEngineWithBot();
  const botPlayer = engine.players.find((p) => p.id === -1);

  // on force une main avec 2 paires + 1 carte solo
  botPlayer.hand = [
    { id: 500, value: "7", suit: "coeur" },
    { id: 501, value: "7", suit: "pique" },
    { id: 502, value: "dame", suit: "trefle" },
    { id: 503, value: "dame", suit: "carreau" },
    { id: 504, value: "as", suit: "coeur" },
  ];

  // bot.discardAllPairs utilise des délais, on fait un mode "rapide" implicite
  await bot.discardAllPairs(false);

  assert.strictEqual(botPlayer.hand.length, 1);
  assert.strictEqual(botPlayer.hand[0].value, "as");
});

test("playPrep marque le bot comme prêt à la fin", async () => {
  const { engine, bot } = makeEngineWithBot();
  const botPlayer = engine.players.find((p) => p.id === -1);

  // main sans aucune paire pour aller vite
  botPlayer.hand = [
    { id: 600, value: "as", suit: "coeur" },
    { id: 601, value: "dame", suit: "pique" },
  ];

  await bot.playPrep();

  assert.strictEqual(botPlayer.ready, true);
});

test("le bot ne fait rien s'il est éliminé", async () => {
  const { engine, bot } = makeEngineWithBot();
  const botPlayer = engine.players.find((p) => p.id === -1);

  botPlayer.eliminated = true;
  botPlayer.hand = [
    { id: 700, value: "7", suit: "coeur" },
    { id: 701, value: "7", suit: "pique" },
  ];

  await bot.play();

  // la main ne bouge pas parce que le bot ne joue pas
  assert.strictEqual(botPlayer.hand.length, 2);
});
