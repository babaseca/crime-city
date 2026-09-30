import { moralAxisLabels } from "../../data/heroPersonalities";
import { attributeLabels } from "../../engine/mission";
import { relationshipLabel, relationshipProfile, relationshipValue } from "../../engine/relationships";
import { formatHeroRole, formatStatusLabel, normalizeDisplayText, titleCase } from "../../utils/formatters";
import Modal from "../common/Modal";
import ProgressBar from "../common/ProgressBar";
import StatusPill from "../common/StatusPill";

const formatTrait = (trait) =>
  titleCase(trait)
    .replace(/\b(E|A|De|Do|Da|Dos|Das)\b/g, (match) => match.toLocaleLowerCase("pt-BR"));

export default function HeroProfileModal({ hero, relationships, heroes, history = [], onClose }) {
  if (!hero) return null;
  const relationRows = heroes
    .filter((candidate) => candidate.id !== hero.id)
    .map((other) => {
      const value = relationshipValue(relationships, hero.id, other.id);
      const axes = relationshipProfile(relationships, hero.id, other.id);
      return { other, value, axes, label: relationshipLabel(value) };
    })
    .sort((first, second) => Math.abs(second.value) - Math.abs(first.value))
    .slice(0, 5);
  const moralEntries = Object.entries(hero.moralProfile ?? {});
  const recentRelationshipChanges = history
    .flatMap((mission) =>
      (mission.relationshipChanges ?? []).map((change) => ({
        ...change,
        missionTitle: mission.event?.titulo,
        day: mission.day,
      })),
    )
    .filter((change) => change.fromHeroId === hero.id || change.toHeroId === hero.id || change.heroIds?.includes(hero.id))
    .slice(-6)
    .reverse();

  return (
    <Modal title={hero.codinome} eyebrow="Ficha operacional" onClose={onClose} size="large">
      <div className="profile-modal-grid">
        <img src={hero.imageUrl} alt="" />
        <section>
          <h3>{hero.nomeCivil}</h3>
          <StatusPill status={hero.status}>{formatStatusLabel(hero.status)}</StatusPill>
          <StatusPill status={hero.teamStatus}>{formatStatusLabel(hero.teamStatus)}</StatusPill>
          <p>{normalizeDisplayText(hero.bio)}</p>
          {hero.shortDescription ? <p><strong>Resumo:</strong> {normalizeDisplayText(hero.shortDescription)}</p> : null}
          {hero.powersSpecialty ? <p><strong>Especialidade:</strong> {normalizeDisplayText(hero.powersSpecialty)}</p> : null}
          {hero.operationalWeakness ? <p><strong>Fraqueza operacional:</strong> {normalizeDisplayText(hero.operationalWeakness)}</p> : null}
          <p><strong>Função:</strong> {formatHeroRole(hero.funcao)}</p>
          <p><strong>Traços:</strong> {(hero.tracos ?? []).map(formatTrait).join(", ")}</p>
          <p><strong>Imagem pública:</strong> {hero.publicImage} · fama {hero.fame}/100 · controvérsia {hero.controversy}/100</p>
        </section>
      </div>
      {hero.alpha11Focus ? (
        <section className="personal-values-card">
          <div>
            <h3>Pessoas antes dos poderes</h3>
            <p><strong>Medo:</strong> {hero.coreFear}</p>
            <p><strong>Desejo:</strong> {hero.coreDesire}</p>
            <p><strong>Falha:</strong> {hero.personalFlaw}</p>
            <p><strong>Linha vermelha:</strong> {hero.hardLine}</p>
            <p><strong>Por que fica:</strong> {hero.reasonToStay}</p>
          </div>
        </section>
      ) : null}
      {moralEntries.length ? (
        <section className="moral-axis-grid">
          {moralEntries.map(([axis, value]) => (
            <div key={axis}>
              <span>{moralAxisLabels[axis] ?? axis}</span>
              <strong>{value}</strong>
              <ProgressBar value={value} />
            </div>
          ))}
        </section>
      ) : null}
      <div className="attribute-grid">
        {Object.entries(hero.atributos).map(([attribute, value]) => (
          <div key={attribute}>
            <span>{attributeLabels[attribute]}</span>
            <strong>{value}</strong>
            <ProgressBar value={value * 10} />
          </div>
        ))}
      </div>
      <div className="hero-record-grid">
        <span>Missões <strong>{hero.missoes ?? 0}</strong></span>
        <span>Sucessos <strong>{hero.sucessos ?? 0}</strong></span>
        <span>Falhas <strong>{hero.falhas ?? 0}</strong></span>
        <span>Civis salvos <strong>{hero.civisSalvos ?? 0}</strong></span>
      </div>
      <section className="timeline-list">
        <h3>Relações importantes</h3>
        {relationRows.map((row) => (
          <p key={row.other.id}>
            <span>{row.other.codinome}</span>
            <strong>{row.value > 0 ? "+" : ""}{row.value} · {row.label}</strong>
            <small>confiança {row.axes.trust} · respeito {row.axes.respect} · proximidade {row.axes.closeness} · tensão {row.axes.tension}</small>
          </p>
        ))}
      </section>
      <section className="timeline-list">
        <h3>Histórico recente de relações</h3>
        {recentRelationshipChanges.length ? recentRelationshipChanges.map((change) => (
          <p key={`${change.sourceMissionId}-${change.fromHeroId}-${change.toHeroId}-${change.sourceFactIds?.join("-")}`}>
            <span>Dia {change.day} · {change.missionTitle}</span>
            <strong>{change.names?.[0]}{" -> "}{change.names?.[1]}</strong>
            <small>{change.reason}</small>
          </p>
        )) : <p className="muted">Sem mudanças relacionais registradas ainda.</p>}
      </section>
      <section className="timeline-list">
        <h3>Ferimentos e arcos</h3>
        {(hero.ferimentos ?? []).length ? hero.ferimentos.map((injury) => <p key={injury.id}><span>{injury.name}</span><strong>{injury.daysRemaining} dias</strong></p>) : <p className="muted">Sem ferimentos ativos.</p>}
        {(hero.arcosPessoais ?? []).map((arc) => <p key={arc}><span>Arco pessoal</span><strong>{arc}</strong></p>)}
      </section>
      <section className="timeline-list">
        <h3>Rede Aurora</h3>
        {(hero.recentPosts ?? []).length ? hero.recentPosts.map((post, index) => <p key={`${post.day}-${index}`}><span>Dia {post.day} · {post.tone}</span><strong>{post.text}</strong></p>) : <p className="muted">Sem posts recentes sobre este herói.</p>}
      </section>
    </Modal>
  );
}
