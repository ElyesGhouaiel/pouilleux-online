const { isPair } = require("./Deck");

// délais pour donner l'impression que le bot réfléchit
const DELAYS = {
  turnStart: [2000, 2000],
  beforeDraw: [1500, 1500],
  afterDraw: [1500, 1500],
  prepStart: [2000, 4000],
  discardFast: [800, 1000],
  discardSlow: [1500, 2500],
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randDelay([base, variance]) {
  return wait(base + Math.random() * variance);
}

class Bot {
  constructor(engine, botPlayerId, emitUpdate) {
    this.engine = engine;
    this.botPlayerId = botPlayerId;
    this.emitUpdate = emitUpdate;
  }

  getPlayer() {
    return this.engine.players.find((p) => p.id === this.botPlayerId);
  }

  isMyTurn() {
    return this.engine.getCurrentPlayer().id === this.botPlayerId;
  }

  async play() {
    const player = this.getPlayer();
    if (!player || player.eliminated || this.engine.finished) return;

    await randDelay(DELAYS.turnStart);
    await this.discardAllPairs();

    if (this.engine.finished || player.eliminated || !this.isMyTurn()) return;

    this.engine.shuffleHand(this.botPlayerId);
    await randDelay(DELAYS.beforeDraw);

    const target = this.engine.getDrawTarget();
    if (!target || target.hand.length === 0) return;

    const randomIndex = Math.floor(Math.random() * target.hand.length);
    this.engine.drawCard(this.botPlayerId, randomIndex);
    this.emitUpdate();

    await randDelay(DELAYS.afterDraw);
    await this.discardAllPairs();
  }

  // phase de préparation : défausse toutes les paires initiales, puis se marque prêt
  async playPrep() {
    if (!this.getPlayer()) return;

    await randDelay(DELAYS.prepStart);
    await this.discardAllPairs(true);

    this.engine.markReady(this.botPlayerId);
    this.emitUpdate();
  }

  async discardAllPairs(slow = false) {
    const player = this.getPlayer();
    if (!player) return;

    while (true) {
      const pair = findPair(player.hand);
      if (!pair) return;

      this.engine.discardPair(this.botPlayerId, pair[0].id, pair[1].id);
      this.emitUpdate();
      await randDelay(slow ? DELAYS.discardSlow : DELAYS.discardFast);
    }
  }
}

function findPair(hand) {
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      if (isPair(hand[i], hand[j])) return [hand[i], hand[j]];
    }
  }
  return null;
}

module.exports = Bot;
