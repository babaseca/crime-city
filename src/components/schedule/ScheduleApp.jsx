import { Bed, Brain, BriefcaseMedical, CalendarClock, Dumbbell, RadioTower } from "lucide-react";
import { scheduleStatuses, setHeroSchedule } from "../../engine/scheduleSystem";
import ProgressBar from "../common/ProgressBar";
import StatusPill from "../common/StatusPill";

const activeStatuses = ["active_team", "assigned_by_command", "reformed_villain"];

const actions = [
  { id: "on_duty", label: "Plantão", icon: RadioTower },
  { id: "resting", label: "Descanso", icon: Bed },
  { id: "training", label: "Treino", icon: Dumbbell },
  { id: "therapy", label: "Terapia", icon: Brain },
  { id: "medical", label: "Tratamento", icon: BriefcaseMedical },
];

export default function ScheduleApp({ game, setGame }) {
  const heroes = (game.heroes ?? []).filter((hero) => activeStatuses.includes(hero.teamStatus) && hero.status !== "morto");

  const updateSchedule = (heroId, status) => {
    setGame((current) => setHeroSchedule(current, heroId, status));
  };

  return (
    <div className="schedule-app hub-module">
      <header className="module-hero slim">
        <div>
          <p className="eyebrow"><CalendarClock size={14} aria-hidden="true" /> Escala</p>
          <h2>Plantão, descanso e limite humano</h2>
          <p>Somente heróis em plantão aparecem no Despacho. Descanso e terapia seguram fadiga, moral e burnout.</p>
        </div>
        <strong>Moral {game.teamMorale ?? 60}</strong>
      </header>

      <div className="schedule-list">
        {heroes.map((hero) => (
          <article className="schedule-row" key={hero.id}>
            <img src={hero.imageUrl} alt="" />
            <div>
              <strong>{hero.codinome}</strong>
              <small>{hero.funcao}</small>
              <span className="chip">{scheduleStatuses[hero.scheduleStatus ?? "on_duty"]}</span>
            </div>
            <StatusPill status={hero.status}>{hero.status}</StatusPill>
            <div className="schedule-bars">
              <ProgressBar value={hero.energia ?? 0} tone="energy" label="Energia" />
              <ProgressBar value={hero.estresse ?? 0} tone="stress" label="Estresse" />
              <ProgressBar value={hero.fatigue ?? 0} tone="injury" label="Fadiga" />
            </div>
            <div className="schedule-actions">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    className={(hero.scheduleStatus ?? "on_duty") === action.id ? "active" : ""}
                    key={action.id}
                    onClick={() => updateSchedule(hero.id, action.id)}
                    title={action.label}
                    type="button"
                  >
                    <Icon size={15} aria-hidden="true" />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
