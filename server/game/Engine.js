const { prepareDeck, isPair, shuffle } = require("./Deck");

class GameEngine {
  constructor(players) {
    this.players = players.map((p) => ({
      id: p.id,
      pseudo: p.pseudo,
      isBot: p.isBot || false,
      hand: [],
      eliminated: false,
      ready: false,
    }));
    this.discardPile = [];
    this.currentTurnIndex = 0;
    this.finished = false;
    this.loser = null;
    // phase : "prep" (défausse des paires initiales) puis "playing" (tours normaux)
    this.phase = "prep";
  }

  start() {
    const { deck } = prepareDeck(this.players.length);
    this.phase = "prep";

    // distribution round-robin
    deck.forEach((card, i) => {
      this.players[i % this.players.length].hand.push(card);
    });
  }

  markReady(playerId) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, error: "joueur pas trouvé" };
    player.ready = true;
    return { ok: true };
  }

  allReady() {
    return this.players.every((p) => p.ready);
  }

  startPlaying() {
    this.phase = "playing";
  }

  getCurrentPlayer() {
    return this.players[this.currentTurnIndex];
  }

  getDrawTarget() {
    // le joueur à qui on pioche = le prochain joueur non éliminé
    return this.players[this.getNextPlayerIndex(this.currentTurnIndex)];
  }

  getNextPlayerIndex(fromIndex) {
    let next = (fromIndex + 1) % this.players.length;
    // au max on fait un tour complet pour éviter la boucle infinie
    for (let i = 0; i < this.players.length; i++) {
      if (!this.players[next].eliminated) return next;
      next = (next + 1) % this.players.length;
    }
    return next;
  }

  discardPair(playerId, cardId1, cardId2) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, error: "joueur pas trouvé" };

    if (cardId1 === cardId2) return { ok: false, error: "c'est la même carte" };

    const card1 = player.hand.find((c) => c.id === cardId1);
    const card2 = player.hand.find((c) => c.id === cardId2);
    if (!card1 || !card2) return { ok: false, error: "carte pas dans ta main" };
    if (!isPair(card1, card2)) return { ok: false, error: "c'est pas une paire" };

    player.hand = player.hand.filter((c) => c.id !== cardId1 && c.id !== cardId2);
    this.discardPile.push(card1, card2);

    this.checkElimination(player);
    return { ok: true };
  }

  drawCard(playerId, cardIndex) {
    if (this.phase !== "playing") {
      return { ok: false, error: "la partie n'a pas encore commencé" };
    }

    const current = this.getCurrentPlayer();
    if (current.id !== playerId) {
      return { ok: false, error: "c'est pas ton tour" };
    }

    const target = this.getDrawTarget();
    if (!target || target.hand.length === 0) {
      return { ok: false, error: "pas de carte à piocher" };
    }

    // borne pour éviter les index hors limites
    const safeIndex = Math.min(cardIndex, target.hand.length - 1);
    const [drawnCard] = target.hand.splice(safeIndex, 1);
    current.hand.push(drawnCard);

    this.checkElimination(target);
    this.nextTurn();
    return { ok: true, card: drawnCard };
  }

  shuffleHand(playerId) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return;
    player.hand = shuffle(player.hand);
  }

  checkElimination(player) {
    if (player.hand.length === 0) player.eliminated = true;
    this.checkGameOver();
  }

  checkGameOver() {
    const remaining = this.players.filter((p) => !p.eliminated);
    if (remaining.length === 1) {
      this.finished = true;
      this.loser = remaining[0];
    }
  }

  nextTurn() {
    if (this.finished) return;
    // getNextPlayerIndex saute déjà les joueurs éliminés, pas besoin de récursion
    this.currentTurnIndex = this.getNextPlayerIndex(this.currentTurnIndex);
  }

  forceDrawRandom(playerId) {
    const target = this.getDrawTarget();
    if (!target || target.hand.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * target.hand.length);
    return this.drawCard(playerId, randomIndex);
  }

  getStateForPlayer(playerId) {
    return {
      players: this.players.map((p) => ({
        id: p.id,
        pseudo: p.pseudo,
        isBot: p.isBot,
        cardCount: p.hand.length,
        eliminated: p.eliminated,
        ready: p.ready,
        hand: p.id === playerId ? p.hand : undefined,
      })),
      phase: this.phase,
      currentTurn: this.getCurrentPlayer().id,
      finished: this.finished,
      loser: this.loser ? { id: this.loser.id, pseudo: this.loser.pseudo } : null,
      drawTargetId: this.getDrawTarget()?.id,
    };
  }
}

module.exports = GameEngine;
