import { useMemo, useState } from "react";
import { GraduationCap, WalletCards } from "lucide-react";
import trainingPrograms from "../../data/trainingPrograms.json";
import { assignTraining } from "../../engine/trainingSystem";
import Button from "../common/Button";
import ProgressBar from "../common/ProgressBar";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value ?? 0);

const activeStatuses = ["active_team", "assigned_by_command", "reformed_villain"];

export default function TrainingApp({ game, setGame }) {
  const heroes = useMemo(
    () => (game.heroes ?? []).filter((hero) => activeStatuses.includes(hero.teamStatus) && hero.status !== "morto"),
    [game.heroes],
  );
  const [heroId, setHeroId] = useState(heroes[0]?.id ?? "");
  const [programId, setProgramId] = useState(trainingPrograms[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const selectedHero = heroes.find((hero) => hero.id === heroId) ?? heroes[0];
  const selectedProgram = trainingPrograms.find((program) => program.id === programId) ?? trainingPrograms[0];

  const assign = () => {
    if (!selectedHero || !selectedProgram) return;
    setGame((current) => {
      const result = assignTraining(current, selectedHero.id, selectedProgram.id);
      setMessage(result.message);
      return result.state;
    });
  };

  return (
    <div className="training-app hub-module">
      <header className="module-hero slim">
        <div>
          <p className="eyebrow"><GraduationCap size={14} aria-hidden="true" /> Treinamento</p>
          <h2>Progresso entre sirenes</h2>
          <p>Treinar tira heróis da escala, consome orçamento e melhora atributos, relações ou recuperação emocional.</p>
        </div>
        <span><WalletCards size={15} aria-hidden="true" /> {money(game.budget)}</span>
      </header>

      {message ? <p className="system-message">{message}</p> : null}

      <div className="training-layout">
        <section className="training-list">
          <h3>Equipe</h3>
          {heroes.map((hero) => (
            <button className={selectedHero?.id === hero.id ? "active" : ""} key={hero.id} onClick={() => setHeroId(hero.id)} type="button">
              <img src={hero.imageUrl} alt="" />
              <span>
                <strong>{hero.codinome}</strong>
                <small>{hero.scheduleStatus ?? "on_duty"} · fadiga {hero.fatigue ?? 0}</small>
              </span>
            </button>
          ))}
        </section>

        <section className="training-programs">
          <h3>Programas</h3>
          <div className="training-program-grid">
            {trainingPrograms.map((program) => (
              <button className={selectedProgram?.id === program.id ? "active" : ""} key={program.id} onClick={() => setProgramId(program.id)} type="button">
                <strong>{program.name}</strong>
                <span>{program.durationDays} dia(s) · {money(program.cost)}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="training-detail">
          {selectedHero && selectedProgram ? (
            <>
              <img src={selectedHero.imageUrl} alt="" />
              <h3>{selectedHero.codinome}</h3>
              <p>{selectedProgram.description}</p>
              <ProgressBar value={selectedHero.energia ?? 0} tone="energy" label="Energia" />
              <ProgressBar value={selectedHero.estresse ?? 0} tone="stress" label="Estresse" />
              <div className="info-grid tight">
                {Object.entries(selectedProgram.statEffects ?? {}).map(([attribute, value]) => (
                  <span key={attribute}>{attribute}: +{value}</span>
                ))}
                <span>Estresse {selectedProgram.stressEffect >= 0 ? "+" : ""}{selectedProgram.stressEffect}</span>
                <span>Fadiga {selectedProgram.fatigueEffect >= 0 ? "+" : ""}{selectedProgram.fatigueEffect}</span>
              </div>
              <Button icon={GraduationCap} onClick={assign}>Agendar treino</Button>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
