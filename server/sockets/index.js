const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const GameEngine = require("../game/Engine");
const Bot = require("../game/Bot");
const { PrismaClient } = require("@prisma/client");

const PREP_DURATION = 60;
const TURN_DURATION = 30;
const MAX_PLAYERS = 4;

const prisma = new PrismaClient();
const rooms = new Map();

let botIdCounter = -1;

function initSocket(server) {
  const io = new Server(server, { cors: { origin: "*" } });

  // authentification au handshake via le JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("pas de token"));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error("token invalide"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`${socket.user.pseudo} connecté`);

    socket.on("create-room", (callback) => {
      const code = generateRoomCode();
      rooms.set(code, {
        code,
        host: socket.user.id,
        players: [makeHumanPlayer(socket.user)],
        engine: null,
        timers: {},
        bots: [],
      });
      socket.join(code);
      socket.roomCode = code;
      callback({ code });
    });

    socket.on("join-room", (code, callback) => {
      const room = rooms.get(code);
      if (!room) return callback({ error: "salle introuvable" });
      if (room.engine) return callback({ error: "partie déjà en cours" });
      if (room.players.length >= MAX_PLAYERS) return callback({ error: "salle pleine" });
      if (room.players.find((p) => p.id === socket.user.id)) {
        return callback({ error: "t'es déjà dedans" });
      }

      room.players.push(makeHumanPlayer(socket.user));
      socket.join(code);
      socket.roomCode = code;

      io.to(code).emit("room-update", { players: room.players });
      callback({ ok: true });
    });

    socket.on("add-bot", (callback) => {
      const room = rooms.get(socket.roomCode);
      if (!room) return callback({ error: "pas de salle" });
      if (room.host !== socket.user.id) return callback({ error: "t'es pas l'hôte" });
      if (room.players.length >= MAX_PLAYERS) return callback({ error: "salle pleine" });

      const botId = botIdCounter--;
      room.players.push({ id: botId, pseudo: `Bot ${Math.abs(botId)}`, isBot: true });
      io.to(socket.roomCode).emit("room-update", { players: room.players });
      callback({ ok: true });
    });

    socket.on("start-game", async (callback) => {
      const room = rooms.get(socket.roomCode);
      if (!room) return callback({ error: "pas de salle" });
      if (room.host !== socket.user.id) return callback({ error: "t'es pas l'hôte" });
      if (room.players.length < 2) return callback({ error: "pas assez de joueurs" });

      await initGame(io, room);
      callback({ ok: true });
    });

    socket.on("player-ready", async (callback) => {
      const room = rooms.get(socket.roomCode);
      if (!room || !room.engine) return callback({ error: "pas de partie" });
      if (room.engine.phase !== "prep") return callback({ error: "plus en phase de préparation" });

      const res = room.engine.markReady(socket.user.id);
      if (!res.ok) return callback(res);

      await emitGameUpdate(io, room);
      if (room.engine.allReady()) await endPrepPhase(io, room);
      callback({ ok: true });
    });

    socket.on("discard-pair", async (data, callback) => {
      const room = rooms.get(socket.roomCode);
      if (!room || !room.engine) return callback({ error: "pas de partie" });

      const result = room.engine.discardPair(socket.user.id, data.cardId1, data.cardId2);
      if (!result.ok) return callback(result);

      await emitGameUpdate(io, room);
      if (room.engine.finished) await saveGame(room);
      callback({ ok: true });
    });

    socket.on("draw-card", async (data, callback) => {
      const room = rooms.get(socket.roomCode);
      if (!room || !room.engine) return callback({ error: "pas de partie" });

      const result = room.engine.drawCard(socket.user.id, data.cardIndex);
      if (!result.ok) return callback(result);

      clearTurnTimer(room);
      await emitGameUpdate(io, room);
      await advanceOrFinish(io, room);
      callback({ ok: true });
    });

    socket.on("shuffle-hand", (callback) => {
      const room = rooms.get(socket.roomCode);
      if (!room || !room.engine) return callback({ error: "pas de partie" });

      room.engine.shuffleHand(socket.user.id);
      emitGameUpdate(io, room);
      callback({ ok: true });
    });

    socket.on("rematch", async (callback) => {
      const room = rooms.get(socket.roomCode);
      if (!room) return callback({ error: "pas de salle" });

      await initGame(io, room);
      callback({ ok: true });
    });

    socket.on("leave-game", async (callback) => {
      const room = rooms.get(socket.roomCode);
      if (!room || !room.engine) return callback({ error: "pas de partie" });

      // le joueur qui abandonne est marqué comme perdant
      room.engine.finished = true;
      room.engine.loser = { id: socket.user.id, pseudo: socket.user.pseudo };
      clearTurnTimer(room);

      await emitGameUpdate(io, room);
      await saveGame(room);
      callback({ ok: true });
    });

    socket.on("disconnect", () => {
      console.log(`${socket.user.pseudo} déconnecté`);
    });
  });

  return io;
}

// helpers

function makeHumanPlayer(user) {
  return { id: user.id, pseudo: user.pseudo, isBot: false };
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function initGame(io, room) {
  room.engine = new GameEngine(room.players);
  room.engine.start();

  // envoyer l'état initial à chaque joueur (chacun voit sa propre main)
  const sockets = await io.in(room.code).fetchSockets();
  for (const s of sockets) {
    s.emit("game-start", room.engine.getStateForPlayer(s.user.id));
  }

  // instancier les bots
  room.bots = room.players
    .filter((p) => p.isBot)
    .map((p) => new Bot(room.engine, p.id, () => emitGameUpdate(io, room)));

  startPrepPhase(io, room);
}

async function emitGameUpdate(io, room) {
  const sockets = await io.in(room.code).fetchSockets();
  for (const s of sockets) {
    s.emit("game-update", room.engine.getStateForPlayer(s.user.id));
  }
}

function startPrepPhase(io, room) {
  clearTurnTimer(room);

  // les bots défaussent leurs paires en parallèle et se marquent prêts
  room.bots.forEach((bot) => {
    bot.playPrep().catch((err) => console.error("erreur bot prep:", err));
  });

  let timeLeft = PREP_DURATION;
  io.to(room.code).emit("prep-tick", timeLeft);

  room.timers.prepInterval = setInterval(async () => {
    timeLeft--;
    io.to(room.code).emit("prep-tick", timeLeft);

    if (room.engine.allReady() || timeLeft <= 0) {
      await endPrepPhase(io, room);
    }
  }, 1000);
}

async function endPrepPhase(io, room) {
  if (!room.engine || room.engine.phase !== "prep") return;

  clearTurnTimer(room);
  room.engine.startPlaying();

  await emitGameUpdate(io, room);
  startTurnTimer(io, room);
  await triggerBotIfNeeded(io, room);
}

function startTurnTimer(io, room) {
  clearTurnTimer(room);
  if (!room.engine || room.engine.finished) return;

  // reset visuel du timer côté client
  io.to(room.code).emit("timer-tick", TURN_DURATION);

  // pas de décompte pour les bots (ils jouent tout seuls)
  if (room.engine.getCurrentPlayer().isBot) return;

  let timeLeft = TURN_DURATION;
  room.timers.interval = setInterval(async () => {
    timeLeft--;
    io.to(room.code).emit("timer-tick", timeLeft);

    if (timeLeft > 0) return;

    // temps écoulé : on force la pioche automatique
    clearTurnTimer(room);
    room.engine.forceDrawRandom(room.engine.getCurrentPlayer().id);
    await emitGameUpdate(io, room);
    await advanceOrFinish(io, room);
  }, 1000);
}

function clearTurnTimer(room) {
  if (room.timers.interval) {
    clearInterval(room.timers.interval);
    room.timers.interval = null;
  }
  if (room.timers.prepInterval) {
    clearInterval(room.timers.prepInterval);
    room.timers.prepInterval = null;
  }
}

// utilitaire : après une action, soit on finit la partie soit on passe au tour suivant
async function advanceOrFinish(io, room) {
  if (room.engine.finished) {
    await saveGame(room);
    return;
  }
  startTurnTimer(io, room);
  await triggerBotIfNeeded(io, room);
}

async function triggerBotIfNeeded(io, room) {
  if (!room.engine || room.engine.finished) return;

  const current = room.engine.getCurrentPlayer();
  if (!current.isBot) return;

  const bot = room.bots.find((b) => b.botPlayerId === current.id);
  if (!bot) return;

  clearTurnTimer(room);
  await bot.play();
  await emitGameUpdate(io, room);
  await advanceOrFinish(io, room);
}

async function saveGame(room) {
  clearTurnTimer(room);

  try {
    const realPlayers = room.players.filter((p) => !p.isBot);
    if (realPlayers.length === 0) return;

    const partie = await prisma.partie.create({
      data: { dateDebut: new Date(), dateFin: new Date() },
    });

    for (const p of realPlayers) {
      await prisma.participation.create({
        data: {
          joueurId: p.id,
          partieId: partie.id,
          estPerdant: room.engine.loser?.id === p.id,
        },
      });
    }
  } catch (err) {
    console.error("erreur sauvegarde partie:", err);
  }
}

module.exports = { initSocket };
