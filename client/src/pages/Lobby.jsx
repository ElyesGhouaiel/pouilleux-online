import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { useNavigate } from "react-router-dom";

export default function Lobby() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [inRoom, setInRoom] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!socket) return;

    socket.on("room-update", (data) => {
      setPlayers(data.players);
    });

    socket.on("game-start", (state) => {
      navigate("/game", { state: { gameState: state, roomCode } });
    });

    return () => {
      socket.off("room-update");
      socket.off("game-start");
    };
  }, [socket, roomCode]);

  function createRoom() {
    socket.emit("create-room", (res) => {
      if (res.code) {
        setRoomCode(res.code);
        setPlayers([{ id: user.id, pseudo: user.pseudo, isBot: false }]);
        setInRoom(true);
        setIsHost(true);
      }
    });
  }

  function joinRoom() {
    setError("");
    socket.emit("join-room", joinCode.toUpperCase(), (res) => {
      if (res.error) {
        setError(res.error);
      } else {
        setRoomCode(joinCode.toUpperCase());
        setInRoom(true);
      }
    });
  }

  function addBot() {
    socket.emit("add-bot", (res) => {
      if (res.error) setError(res.error);
    });
  }

  function startGame() {
    socket.emit("start-game", (res) => {
      if (res.error) setError(res.error);
    });
  }

  if (!inRoom) {
    return (
      <div className="lobby-page">
        <div className="lobby-header">
          <h1>Le Pouilleux</h1>
          <div className="user-info">
            <span>{user?.pseudo}</span>
            <button onClick={logout} className="btn-logout">Déconnexion</button>
          </div>
        </div>

        <div className="lobby-actions">
          <div className="lobby-card">
            <h2>Créer une partie</h2>
            <button onClick={createRoom}>Créer une salle</button>
          </div>

          <div className="lobby-card">
            <h2>Rejoindre une partie</h2>
            {error && <p className="error">{error}</p>}
            <input
              type="text"
              placeholder="Code de la salle"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              maxLength={6}
            />
            <button onClick={joinRoom}>Rejoindre</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-page">
      <div className="room-info">
        <h1>Salle : {roomCode}</h1>
        <p className="room-code-hint">Partage ce code à tes amis</p>

        <div className="players-list">
          <h3>Joueurs ({players.length}/4)</h3>
          {players.map((p) => (
            <div key={p.id} className="player-tag">
              {p.pseudo} {p.isBot && "(Bot)"} {p.id === user?.id && "(toi)"}
            </div>
          ))}
        </div>

        {isHost && (
          <div className="host-actions">
            <button onClick={addBot} disabled={players.length >= 4}>
              Ajouter un bot
            </button>
            <button
              onClick={startGame}
              disabled={players.length < 2}
              className="btn-start"
            >
              Lancer la partie
            </button>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
