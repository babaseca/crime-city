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
} from "lucide-react";
import { formatMissionResult, formatMoney } from "../../utils/formatters";
import Button from "../common/Button";
import Modal from "../common/Modal";
import RiskBadge from "../common/RiskBadge";
import MissionReportCinematic from "../mission/MissionReportCinematic";

const signed = (value) => `${value > 0 ? "+" : ""}${value}`;

export default function MissionResultModal({ mission, onClose, onNavigate }) {
  if (!mission) return null;

  const goTo = (appId) => {
    onClose();
    onNavigate?.(appId);
  };
  const resultLabel = formatMissionResult(mission.resultType ?? mission.outcome);
  const factionName = mission.factionImpact?.factionName ?? (mission.event.factionId ? "Facção suspeita" : "Sem facção confirmada");

  return (
    <Modal title="Relatório de missão" eyebrow={resultLabel} onClose={onClose} size="large">
      <section className={`mission-report-v2 ${mission.success ? "success" : "failure"}`}>
        <header className="mission-report-hero">
          <span className={mission.success ? "result-icon success" : "result-icon fail"}>
            {mission.success ? <BadgeCheck size={28} aria-hidden="true" /> : <AlertTriangle size={28} aria-hidden="true" />}
          </span>
          <div>
            <p className="eyebrow">{mission.success ? "ocorrência encerrada" : "ocorrência com falha"}</p>
            <h2>{mission.event.titulo}</h2>
            <div className="mission-hero-meta">
              <span><MapPinned size={14} aria-hidden="true" /> {mission.event.bairro}</span>
              <span><ShieldAlert size={14} aria-hidden="true" /> {factionName}</span>
              <span>Dificuldade {mission.event.dificuldade}</span>
              <RiskBadge level={mission.event.nivelRisco} />
            </div>
          </div>
          <strong className="mission-result-seal">{resultLabel}</strong>
        </header>

        <section className="mission-narrative-block">
          <p>{mission.narrative}</p>
        </section>

        <MissionReportCinematic mission={mission} />

        <div className="operation-metrics">
          <article><UserRoundCheck size={18} /><span>Civis salvos</span><strong>{mission.civiliansSaved}</strong></article>
          <article><Sparkles size={18} /><span>Reputação</span><strong>{signed(mission.reputationDelta)}</strong></article>
          <article><Coins size={18} /><span>Orçamento</span><strong>{formatMoney(mission.budgetDelta)}</strong></article>
          <article><ShieldAlert size={18} /><span>Dano material</span><RiskBadge label={mission.materialDamage} level={mission.materialDamage} /></article>
          <article><UsersRound size={18} /><span>XP base</span><strong>+{mission.experienceGain}</strong></article>
          <article><MapPinned size={18} /><span>Bairro</span><strong>{mission.districtImpact?.districtName ?? mission.event.bairro}</strong></article>
        </div>

        <section className="mission-team-section">
          <header>
            <p className="eyebrow">equipe enviada</p>
            <h3>Consequências individuais</h3>
          </header>
          <div className="mission-team-grid">
            {mission.heroUpdates.map((update) => {
              const name = mission.heroNames[mission.heroIds.indexOf(update.heroId)] ?? update.heroId;
              const injury = mission.injuries.find((item) => item.heroId === update.heroId);
              return (
                <article key={update.heroId}>
                  <strong>{name}</strong>
                  <span>+{update.experienceGain} XP</span>
                  <span>-{update.energyLoss} energia</span>
                  <span>+{update.stressGain} estresse</span>
                  {injury ? <em>{injury.injury.name}</em> : <small>Sem lesão registrada</small>}
                </article>
              );
            })}
          </div>
        </section>

        {mission.dialogue ? (
          <section className="radio-scene">
            <header>
              <Radio size={18} aria-hidden="true" />
              <div>
                <p className="eyebrow">cena da missão</p>
                <h3>Canal de rádio · {mission.dialogue.temperature}</h3>
              </div>
            </header>
            <div className="radio-dialogue-lines">
              {mission.dialogue.lines.map((line, index) => (
                <blockquote key={`${line.speaker}-${index}`}>
                  <strong>{line.speaker}</strong>
                  <span>“{line.text}”</span>
                </blockquote>
              ))}
            </div>
          </section>
        ) : null}

        <div className="consequence-grid polished">
          <section>
            <h3>Relações</h3>
            {mission.relationshipChanges.length ? mission.relationshipChanges.map((change) => (
              <p key={change.key}>
                <span>{change.names.join(" + ")}</span>
                <strong>{signed(change.delta)} · {change.label}</strong>
              </p>
            )) : <p className="muted">Missão solo: sem mudança de dupla.</p>}
          </section>

          <section>
            <h3>Consequências da cidade</h3>
            <p><span>Bairro</span><strong>{mission.districtImpact?.districtName ?? mission.event.bairro}</strong></p>
            <p><span>Facção</span><strong>{factionName}</strong></p>
            {mission.capturedVillain ? <p><span>Captura</span><strong>{mission.capturedVillain.alcunha}</strong></p> : null}
            {mission.emotionalConsequences.map((item) => <p key={item}><span>Equipe</span><strong>{item}</strong></p>)}
          </section>
        </div>

        {mission.activeCombos?.length ? (
          <section className="combo-preview result-combos">
            <strong>Sinergia usada</strong>
            {mission.activeCombos.map((combo) => <span className="chip requirement" key={combo.id}>{combo.name}</span>)}
          </section>
        ) : null}

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
                    <blockquote>“{death.lastLine}”</blockquote>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="mission-report-actions">
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          <Button variant="ghost" onClick={() => goTo("city")}>Ver bairro</Button>
          {mission.capturedVillain ? <Button variant="ghost" onClick={() => goTo("villains")}>Ver vilão</Button> : null}
          <Button onClick={() => goTo("heroes")}>Ver equipe</Button>
        </footer>
      </section>
    </Modal>
  );
}
