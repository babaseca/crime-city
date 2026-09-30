import { Clock, MapPin, Skull, Zap } from "lucide-react";
import { getOccurrenceVisual } from "../../data/occurrenceVisuals";
import RiskBadge from "../common/RiskBadge";

const toneForEvent = (event) => {
  if ((event.nivelRisco ?? 0) >= 4) return "danger";
  if ((event.dificuldade ?? 0) >= 62) return "warn";
  return "info";
};

export default function AlertCard({ event, active, selectedHeroes, preview, onSelect }) {
  const tone = toneForEvent(event);
  const timeLabel = event.limiteTempoNarrativo ?? "tempo aberto";
  const visual = getOccurrenceVisual(event);

  return (
    <button className={`alert-card alert-card--ops alert-card--${tone} ${active ? "active" : ""}`} onClick={() => onSelect(event.id)} type="button">
      <span className={`alert-card__thumb alert-card__thumb--${visual.tone}`}>
        <img src={visual.src} alt="" />
        <span className="alert-card__icon"><Skull size={17} aria-hidden="true" /></span>
      </span>
      <span className="alert-card__main">
        <small><MapPin size={12} aria-hidden="true" /> {event.bairro}</small>
        <strong>{event.titulo}</strong>
        <em>{selectedHeroes.length ? selectedHeroes.map((hero) => hero.codinome).join(", ") : "Sem equipe definida"}</em>
      </span>
      <span className="alert-card__side">
        <RiskBadge level={event.nivelRisco} />
        <small><Clock size={12} aria-hidden="true" /> {timeLabel}</small>
        <small><Zap size={12} aria-hidden="true" /> {preview ? `${preview.chance}%` : event.dificuldade}</small>
      </span>
    </button>
  );
}
