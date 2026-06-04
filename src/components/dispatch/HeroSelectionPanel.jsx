import { Users } from "lucide-react";
import ProgressBar from "../common/ProgressBar";
import StatusPill from "../common/StatusPill";
import { formatHeroRole, formatStatusLabel } from "../../utils/formatters";

export default function HeroSelectionPanel({ heroes, selectedIds, onToggleHero, isMissionAvailable }) {
  return (
    <aside className="hero-selection-panel">
      <header className="section-header compact">
        <div>
          <p className="eyebrow"><Users size={13} aria-hidden="true" /> escala</p>
          <h3>Equipe disponível</h3>
        </div>
        <strong>{selectedIds.length}/3</strong>
      </header>
      <div className="dispatch-hero-list">
        {heroes.map((hero) => {
          const selected = selectedIds.includes(hero.id);
          const unavailable = !isMissionAvailable(hero) || (!selected && selectedIds.length >= 3);

          return (
            <button className={`dispatch-hero-card ${selected ? "selected" : ""}`} disabled={unavailable} key={hero.id} onClick={() => onToggleHero(hero.id)} type="button">
              <img src={hero.imageUrl} alt="" />
              <span className="hero-line">
                <strong>{hero.codinome}</strong>
                <StatusPill status={hero.status}>{formatStatusLabel(hero.status)}</StatusPill>
              </span>
              <small>{formatHeroRole(hero.funcao)}</small>
              <small>{hero.scheduleStatus === "on_duty" ? "em plantão" : hero.scheduleStatus} · fadiga {hero.fatigue ?? 0}</small>
              {hero.teamStatus === "assigned_by_command" ? <small>reforco do Comando</small> : null}
              {hero.teamStatus === "reformed_villain" ? <small>aliado reformado</small> : null}
              <span className="mini-bars">
                <span>Energia <ProgressBar value={hero.energia} tone="energy" /></span>
                <span>Estresse <ProgressBar value={hero.estresse} tone="stress" /></span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
