import { Clock, MapPin, Zap } from "lucide-react";
import { attributeLabels } from "../../engine/mission";
import Button from "../common/Button";
import RiskBadge from "../common/RiskBadge";

export default function AlertCard({ event, active, selectedHeroes, preview, onSelect }) {
  const requirements = event.requisitosPrincipais.slice(0, 2);
  const extraRequirements = Math.max(0, event.requisitosPrincipais.length - requirements.length);

  return (
    <article className={`alert-card ${active ? "active" : ""}`}>
      <div className="alert-card__top">
        <p className="eyebrow"><MapPin size={13} aria-hidden="true" /> {event.bairro}</p>
        <RiskBadge level={event.nivelRisco} />
      </div>
      <h3>{event.titulo}</h3>
      <div className="alert-meta">
        <span><Clock size={13} aria-hidden="true" /> {event.limiteTempoNarrativo}</span>
        <span><Zap size={13} aria-hidden="true" /> dificuldade {event.dificuldade}</span>
      </div>
      <div className="chip-row compact-chips">
        {requirements.map((requirement) => (
          <span className="chip requirement" key={requirement}>{attributeLabels[requirement]}</span>
        ))}
        {extraRequirements ? <span className="chip">+{extraRequirements} requisito(s)</span> : null}
      </div>
      <div className="alert-card__footer">
        <span>{selectedHeroes.length ? selectedHeroes.map((hero) => hero.codinome).join(", ") : "sem equipe definida"}</span>
        <Button variant={active ? "primary" : "secondary"} onClick={() => onSelect(event.id)}>
          {preview ? `${preview.chance}%` : active ? "Selecionado" : "Planejar"}
        </Button>
      </div>
    </article>
  );
}
