import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function AiAssistant({ gameState, myHand, isMyTurn }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  function buildContext() {
    if (!gameState) return "";

    const handStr = myHand.map((c) => `${c.value} de ${c.suit}`).join(", ");
    const opponents = gameState.players
      .filter((p) => p.hand === undefined)
      .map((p) => `${p.pseudo} (${p.cardCount} cartes${p.eliminated ? ", éliminé" : ""})`)
      .join(", ");

    return [
      `Ma main : ${handStr}`,
      `Adversaires : ${opponents}`,
      `C'est ${isMyTurn ? "mon" : "pas mon"} tour.`,
    ].join("\n");
  }

  async function send(overrideMsg) {
    const msg = (overrideMsg ?? input).trim();
    if (!msg || loading) return;

    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: msg,
          context: buildContext(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "ai", text: `erreur : ${data.error}` }]);
      } else {
        setMessages((m) => [...m, { role: "ai", text: data.reply }]);
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "ai", text: "erreur de connexion" }]);
    } finally {
      setLoading(false);
    }
  }

  function askQuickTip() {
    send("Qu'est-ce que tu me conseilles de faire maintenant ?");
  }

  return (
    <>
      <button
        className="ai-toggle"
        onClick={() => setOpen(!open)}
        title="Assistant IA"
      >
        💡
      </button>

      {open && (
        <div className="ai-panel">
          <div className="ai-header">
            <span>Assistant IA</span>
            <button onClick={() => setOpen(false)} className="ai-close">×</button>
          </div>

          <div className="ai-messages">
            {messages.length === 0 && (
              <div className="ai-welcome">
                <p>Salut ! Je peux te conseiller pendant la partie ou t'expliquer les règles.</p>
                <button className="ai-quick" onClick={askQuickTip}>
                  Conseille-moi
                </button>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ai-msg-${m.role}`}>
                {m.text}
              </div>
            ))}
            {loading && <div className="ai-msg ai-msg-ai">...</div>}
          </div>

          <div className="ai-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Pose ta question..."
              disabled={loading}
            />
            <button onClick={send} disabled={loading || !input.trim()}>
              Envoyer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
