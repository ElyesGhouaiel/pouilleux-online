const suitSymbols = {
  coeur: "♥",
  carreau: "♦",
  pique: "♠",
  trefle: "♣",
};

const suitColors = {
  coeur: "red",
  carreau: "red",
  pique: "black",
  trefle: "black",
};

const valueLabels = {
  valet: "V",
  dame: "D",
  roi: "R",
  as: "A",
};

export default function Card({ card, faceDown, selected, onClick }) {
  if (faceDown) {
    return (
      <div className={`card card-back ${onClick ? "clickable" : ""}`} onClick={onClick}>
        <span>?</span>
      </div>
    );
  }

  const symbol = suitSymbols[card.suit];
  const color = suitColors[card.suit];
  const label = valueLabels[card.value] || card.value;

  return (
    <div
      className={`card ${selected ? "selected" : ""} ${onClick ? "clickable" : ""}`}
      style={{ color }}
      onClick={onClick}
    >
      <div className="card-corner top">{label}{symbol}</div>
      <div className="card-center">{symbol}</div>
      <div className="card-corner bottom">{label}{symbol}</div>
    </div>
  );
}
