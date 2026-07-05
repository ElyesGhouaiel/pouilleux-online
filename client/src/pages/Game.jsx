import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import Card from "../components/Card";
import AiAssistant from "../components/AiAssistant";

export default function Game() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState(location.state?.gameState || null);
  const [selectedCards, setSelectedCards] = useState([]);
  const [timer, setTimer] = useState(30);
  const [prepTimer, setPrepTimer] = useState(60);
  const [message, setMessage] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on("game-update", (state) => {
      setGameState(state);
      setMessage("");
    });

    socket.on("game-start", (state) => {
      setGameState(state);
      setSelectedCards([]);
      setMessage("");
    });

    socket.on("timer-tick", (t) => setTimer(t));
    socket.on("prep-tick", (t) => setPrepTimer(t));

    return () => {
      socket.off("game-update");
      socket.off("game-start");
      socket.off("timer-tick");
      socket.off("prep-tick");
    };
  }, [socket]);

  if (!gameState) {
    return <div className="game-page"><p className="loading">Chargement...</p></div>;
  }

  const me = gameState.players.find((p) => p.id === user.id);
  const myHand = me?.hand || [];
  const isMyTurn = gameState.currentTurn === user.id;
  const currentPlayer = gameState.players.find((p) => p.id === gameState.currentTurn);
  const isPrepPhase = gameState.phase === "prep";
  const amReady = me?.ready || false;
  const isBotTurn = !isPrepPhase && currentPlayer?.isBot;
  const opponents = gameState.players.filter((p) => p.id !== user.id);

  // angle de la flèche du tour : 180° = pointe vers moi (en bas),
  // sinon on répartit les adversaires sur un arc au-dessus.
  function getArrowAngle() {
    if (isPrepPhase) return 0;
    if (isMyTurn) return 180;

    const idx = opponents.findIndex((p) => p.id === gameState.currentTurn);
    if (idx === -1) return 180;

    const n = opponents.length;
    if (n === 1) return 0;

    const spread = 55;
    const step = (spread * 2) / (n - 1);
    return -spread + idx * step;
  }

  function toggleCard(cardId) {
    setSelectedCards((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= 2) return [cardId];
      return [...prev, cardId];
    });
  }

  function discardPair() {
    if (selectedCards.length !== 2) return;
    socket.emit(
      "discard-pair",
      { cardId1: selectedCards[0], cardId2: selectedCards[1] },
      (res) => {
        if (res.error) setMessage(res.error);
        else setSelectedCards([]);
      }
    );
  }

  function drawCard(index) {
    if (!isMyTurn || isPrepPhase) return;
    socket.emit("draw-card", { cardIndex: index }, (res) => {
      if (res.error) setMessage(res.error);
    });
  }

  function shuffleHand() {
    socket.emit("shuffle-hand", () => {});
  }

  function setReady() {
    socket.emit("player-ready", (res) => {
      if (res && res.error) setMessage(res.error);
    });
  }

  function rematch() {
    socket.emit("rematch", (res) => {
      if (res.error) setMessage(res.error);
    });
  }

  function leaveGame() {
    socket.emit("leave-game", (res) => {
      if (res && res.error) setMessage(res.error);
    });
    navigate("/lobby");
  }

  if (gameState.finished) {
    const lost = gameState.loser?.id === user.id;
    return (
      <div className="game-page">
        <div className="game-over">
          <h1>{lost ? "Tu as perdu..." : "Tu as gagné !"}</h1>
          <p>Le pouilleux : <strong>{gameState.loser?.pseudo}</strong></p>
          <div className="game-over-actions">
            <button onClick={rematch}>Rejouer</button>
            <button className="btn-secondary" onClick={() => navigate("/lobby")}>
              Retour au lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page">
      <div className="game-top-bar">
        <div className="turn-info">
          {isPrepPhase ? (
            <span className="prep-label">Phase de préparation · Défausse tes paires</span>
          ) : isMyTurn ? (
            <span className="turn-yours">À toi de jouer</span>
          ) : (
            <span>Tour de <strong>{currentPlayer?.pseudo}</strong></span>
          )}
        </div>
        <div className={`timer ${!isBotTurn && (isPrepPhase ? prepTimer : timer) <= 10 ? "timer-warn" : ""}`}>
          {isBotTurn ? "..." : `${isPrepPhase ? prepTimer : timer}s`}
        </div>
        <button className="btn-leave" onClick={() => setConfirmLeave(true)}>
          Abandonner
        </button>
      </div>

      {confirmLeave && (
        <div className="modal-overlay" onClick={() => setConfirmLeave(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Abandonner la partie ?</h3>
            <p>Tu seras compté comme perdant.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmLeave(false)}>
                Annuler
              </button>
              <button className="btn-danger" onClick={leaveGame}>
                Oui, abandonner
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="opponents">
        {opponents.map((p) => {
            const isDrawTarget = p.id === gameState.drawTargetId;
            const isCurrent = !isPrepPhase && p.id === gameState.currentTurn;
            const canDraw = !isPrepPhase && isMyTurn && isDrawTarget && !p.eliminated;

            return (
              <div
                key={p.id}
                className={`opponent
                  ${p.eliminated ? "eliminated" : ""}
                  ${isCurrent ? "is-current" : ""}
                  ${canDraw ? "is-target" : ""}
                  ${isPrepPhase && p.ready ? "is-ready" : ""}`}
              >
                <div className="opponent-header">
                  <span className="opponent-name">
                    {p.pseudo} {p.isBot && <span className="bot-tag">bot</span>}
                  </span>
                  {p.eliminated ? (
                    <span className="badge badge-done">Terminé</span>
                  ) : isPrepPhase && p.ready ? (
                    <span className="badge badge-ready">Prêt</span>
                  ) : (
                    <span className="card-count">{p.cardCount} cartes</span>
                  )}
                </div>

                {!p.eliminated && (
                  <div className="opponent-cards">
                    {Array.from({ length: p.cardCount }).map((_, i) => (
                      <Card
                        key={i}
                        faceDown
                        onClick={canDraw ? () => drawCard(i) : undefined}
                      />
                    ))}
                  </div>
                )}

                {canDraw && (
                  <p className="draw-hint">Clique sur une carte pour piocher</p>
                )}
              </div>
            );
          })}
      </div>

      {!isPrepPhase && (
        <div className="turn-arrow-wrap">
          <div
            className={`turn-arrow ${isMyTurn ? "pointing-me" : ""}`}
            style={{ transform: `rotate(${getArrowAngle()}deg)` }}
            aria-label="Indicateur de tour"
          >
            <svg viewBox="0 0 24 24" width="56" height="56">
              <path d="M12 2 L20 12 L15 12 L15 22 L9 22 L9 12 L4 12 Z" fill="currentColor" />
            </svg>
          </div>
        </div>
      )}

      {message && <p className="error game-error">{message}</p>}

      <div className="my-hand-section">
        <div className="my-hand-header">
          <span>Ma main ({myHand.length})</span>
          <div className="hand-actions">
            {isPrepPhase && (
              <button
                className="btn-ready"
                onClick={setReady}
                disabled={amReady}
              >
                {amReady ? "En attente des autres..." : "Je suis prêt"}
              </button>
            )}
            <button onClick={shuffleHand}>Mélanger</button>
            <button
              className="btn-primary"
              onClick={discardPair}
              disabled={selectedCards.length !== 2}
            >
              Défausser la paire
            </button>
          </div>
        </div>
        <div className="my-hand">
          {myHand.length === 0 ? (
            <p className="empty-hand">Tu n'as plus de cartes</p>
          ) : (
            myHand.map((card) => (
              <Card
                key={card.id}
                card={card}
                selected={selectedCards.includes(card.id)}
                onClick={() => toggleCard(card.id)}
              />
            ))
          )}
        </div>
      </div>

      <AiAssistant gameState={gameState} myHand={myHand} isMyTurn={isMyTurn} />
    </div>
  );
}
