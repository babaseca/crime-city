import {
  AlertTriangle,
  BadgeCheck,
  Coins,
  HeartCrack,
  MapPinned,
  Radio,
  ShieldAlert,
  Skull,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import { formatFactionName, formatMissionResult, formatMoney, titleCase } from "../../utils/formatters";
import Button from "../common/Button";
import Modal from "../common/Modal";
import ProgressBar from "../common/ProgressBar";
import RiskBadge from "../common/RiskBadge";
import MissionReportCinematic from "../mission/MissionReportCinematic";

const signed = (value) => `${value > 0 ? "+" : ""}${value}`;

const relationshipAxisLabels = {
  trust: "confiança",
  respect: "respeito",
  closeness: "proximidade",
  tension: "tensão",
};

const deltaSummary = (delta = {}) =>
  Object.entries(delta)
    .filter(([, value]) => value)
    .map(([axis, value]) => `${relationshipAxisLabels[axis] ?? titleCase(axis)} ${signed(value)}`)
    .join(" · ");

const contributionLabel = (update, index) => {
  if (update.died) return "Sacrifício";
  if (update.injury) return "Resgate sob risco";
  return ["Coordenação", "Evacuação", "Inteligência"][index % 3];
};

export default function MissionResultModal({ mission, onClose, onNavigate, factions = [] }) {
  if (!mission) return null;

  const goTo = (appId) => {
    onClose();
    onNavigate?.(appId);
  };
  const resultLabel = formatMissionResult(mission.resultType ?? mission.outcome);
  const factionName =
    mission.factionImpact?.factionName ??
    (mission.event.factionId ? formatFactionName(mission.event.factionId, factions) : "Sem facção confirmada");
  const resultIcon = mission.success ? <BadgeCheck size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />;

  return (
    <Modal title="Play-by-play da Operação" eyebrow="Pós-missão" onClose={onClose} size="mission">
      <section className={`mission-report-ops ${mission.success ? "success" : "failure"}`}>
        <header className="mission-ops-heading">
          <div>
            <p className="eyebrow">Pós-missão</p>
            <h2>Play-by-play da Operação</h2>
          </div>
          <strong className="mission-ops-seal">{resultIcon}{resultLabel}</strong>
          <div className="mission-ops-actions">
            <Button variant="secondary" icon={MapPinned} onClick={() => goTo("city")}>Ver bairro</Button>
            <Button variant="secondary" icon={UsersRound} onClick={() => goTo("heroes")}>Ver equipe</Button>
            <Button icon={X} onClick={onClose}>Fechar</Button>
          </div>
        </header>

        <div className="mission-ops-grid">
          <main className="mission-ops-main">
            <section className="mission-ops-summary">
              <div className="mission-scene-image" aria-hidden="true">
                <MapPinned size={34} />
              </div>
              <div>
                <h3>{mission.event.titulo}</h3>
                <p>{mission.event.bairro} · {factionName}</p>
                <blockquote>{mission.narrative}</blockquote>
              </div>
            </section>

            <MissionReportCinematic mission={mission} />
          </main>

          <section className="mission-ops-center">
            <section className="mission-result-panel">
              <p className="eyebrow">Resultado operacional</p>
              <div className="mission-result-grid">
                <article><UserRoundCheck size={18} /><span>Civis salvos</span><strong>{mission.civiliansSaved}</strong></article>
                <article><ShieldAlert size={18} /><span>Dano material</span><strong>{String(mission.materialDamage).toLocaleUpperCase("pt-BR")}</strong></article>
                <article><Sparkles size={18} /><span>Reputação</span><strong>{signed(mission.reputationDelta)}</strong></article>
                <article><MapPinned size={18} /><span>Bairro</span><strong>{mission.districtImpact?.districtName ?? mission.event.bairro}</strong></article>
                <article><Coins size={18} /><span>Orçamento</span><strong>{formatMoney(mission.budgetDelta)}</strong></article>
                <article><Skull size={18} /><span>Facção</span><strong>{factionName}</strong></article>
              </div>
            </section>

            {mission.dialogue ? (
              <section className="radio-scene radio-scene--ops">
                <header>
                  <Radio size={18} aria-hidden="true" />
                  <div>
                    <p className="eyebrow">Cena da missão · facção em movimento</p>
                    <h3>Canal de rádio</h3>
                  </div>
                </header>
                <div className="radio-dialogue-lines">
                  {mission.dialogue.lines.map((line, index) => (
                    <blockquote key={`${line.speaker}-${index}`}>
                      <strong>{line.speaker}</strong>
                      <span>"{line.text}"</span>
                    </blockquote>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="consequence-panel">
              <p className="eyebrow">Consequências</p>
              <div>
                <span className="consequence-chip good">confiança do bairro {mission.success ? "+" : "-"}</span>
                <span className="consequence-chip warn">pressão da facção +</span>
                <span className="consequence-chip info">equipe saiu mais próxima</span>
                <span className="consequence-chip muted">tensão da equipe {mission.injuries.length ? "+" : "-"}</span>
                {mission.moralAnalysis?.tensionRisk >= 16 ? <span className="consequence-chip warn">conflito moral +</span> : null}
                {mission.moralAnalysis?.bonus >= 4 ? <span className="consequence-chip good">valores alinhados +</span> : null}
              </div>
            </section>

            {(mission.missionFacts ?? []).length ? (
              <section className="mission-facts-panel">
                <p className="eyebrow">Fatos de missão</p>
                <div>
                  {mission.missionFacts.slice(0, 6).map((fact) => (
                    <span className="mission-fact-chip" key={fact.id}>{titleCase(fact.type)} · {fact.severity}</span>
                  ))}
                </div>
              </section>
            ) : null}

            {(mission.relationshipChanges ?? []).length ? (
              <section className="relationship-changes-panel">
                <p className="eyebrow">Relações alteradas por fatos</p>
                {(mission.relationshipChanges ?? []).slice(0, 5).map((change) => (
                  <article key={`${change.fromHeroId}-${change.toHeroId}-${change.sourceFactIds?.join("-")}`}>
                    <strong>{change.names?.[0]}{" -> "}{change.names?.[1]}</strong>
                    <span>{deltaSummary(change.delta) || signed(change.scoreDelta ?? 0)}</span>
                    <p>{change.reason}</p>
                  </article>
                ))}
              </section>
            ) : null}

            {mission.teamScene ? (
              <section className="team-scene-panel">
                <p className="eyebrow">Cena de equipe</p>
                <strong>{titleCase(mission.teamScene.type)}</strong>
                <p>{mission.teamScene.text}</p>
              </section>
            ) : null}
          </section>

          <aside className="mission-field-team">
            <header>
              <p className="eyebrow">Equipe em campo</p>
              <strong>{mission.heroUpdates.length}/3</strong>
            </header>
            <div className="mission-field-team-list">
              {mission.heroUpdates.map((update, index) => {
                const hero = update.nextHero;
                const name = mission.heroNames[mission.heroIds.indexOf(update.heroId)] ?? hero?.codinome ?? update.heroId;
                const injury = mission.injuries.find((item) => item.heroId === update.heroId);
                return (
                  <article className={update.died ? "lost" : ""} key={update.heroId}>
                    <img src={hero?.imageUrl} alt="" />
                    <div>
                      <strong>{name}</strong>
                      <small>{hero?.funcao ?? "Operacional"}</small>
                      <span className="field-badge">{contributionLabel(update, index)}</span>
                      <div className="hero-vital-row">
                        <span>Energia <ProgressBar value={hero?.energia ?? 0} tone="energy" /></span>
                        <span>Estresse <ProgressBar value={hero?.estresse ?? 0} tone="stress" /></span>
                      </div>
                      <p>{injury ? injury.injury.name : update.died ? "No memorial" : "Sem lesão registrada"}</p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mission-complete-card">
              <Sparkles size={22} aria-hidden="true" />
              <div>
                <strong>{mission.success ? "Missão concluída com sucesso" : "Missão encerrada com alerta"}</strong>
                <span>Alerta encerrado em {mission.event.limiteTempoNarrativo ?? "tempo operacional"}</span>
              </div>
            </div>
          </aside>
        </div>

        {mission.capturedVillain ? (
          <section className="capture-banner polished">
            <UserRoundCheck size={20} aria-hidden="true" />
            <div>
              <strong>Vilão capturado: {mission.capturedVillain.alcunha}</strong>
              <p>{mission.capturedVillain.nome} foi adicionado ao Arquivo de Vilões.</p>
            </div>
          </section>
        ) : null}

        {mission.deaths.length ? (
          <section className="death-report">
            <HeartCrack size={22} aria-hidden="true" />
            <div>
              <h3>Relatório especial de perda</h3>
              {mission.deaths.map((death) => (
                <article key={death.heroId}>
                  <img src={death.imageUrl} alt="" />
                  <div>
                    <strong><Skull size={15} aria-hidden="true" /> {death.codinome} · {death.nomeCivil}</strong>
                    <p>Último ato: {death.legacy}</p>
                    <blockquote>"{death.lastLine}"</blockquote>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="mission-report-actions mission-report-actions--ops">
          <RiskBadge level={mission.event.nivelRisco} />
          <span>Chance estimada {mission.chance}% · rolagem {mission.roll}</span>
          {mission.capturedVillain ? <Button variant="ghost" onClick={() => goTo("villains")}>Ver vilão</Button> : null}
        </footer>
      </section>
    </Modal>
  );
}
