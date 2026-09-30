import { ArrowRight, Send, Users } from "lucide-react";
import ProgressBar from "../common/ProgressBar";
import StatusPill from "../common/StatusPill";
import { calculateMissionReactions } from "../../engine/missionReactionSystem";
import { relationshipProfile } from "../../engine/relationships";
import { formatHeroRole, formatStatusLabel } from "../../utils/formatters";

const initials = (name = "") =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");

const alphaWarningsFor = (selectedHeroes, relationships = {}, preview = null) => {
  const warnings = [];

  for (let i = 0; i < selectedHeroes.length; i += 1) {
    for (let j = i + 1; j < selectedHeroes.length; j += 1) {
      const first = selectedHeroes[i];
      const second = selectedHeroes[j];
      const relation = relationshipProfile(relationships, first.id, second.id);
      const friction = preview?.moralAnalysis?.pairFriction?.find((item) => item.heroIds.includes(first.id) && item.heroIds.includes(second.id));

      if (friction) {
        warnings.push({ tone: "warn", title: `${first.codinome} e ${second.codinome}`, text: `Tensão moral: ${friction.notes.join(", ")}.` });
      } else if ((relation.trust ?? 0) >= 65 && (relation.respect ?? 0) >= 65) {
        warnings.push({ tone: "good", title: `${first.codinome} e ${second.codinome}`, text: "Confiança elevada. A dupla tende a operar com pouca fala e boa cobertura." });
      } else if ((relation.tension ?? 0) >= 45) {
        warnings.push({ tone: "warn", title: `${first.codinome} e ${second.codinome}`, text: "Atrito conhecido. Pode render eficiência sob pressão, mas também custo emocional." });
      }
    }
  }

  selectedHeroes.forEach((hero) => {
    const threshold = hero.moralProfile?.disobedienceThreshold ?? 70;
    if ((hero.estresse ?? 0) + (preview?.moralStress ?? 0) > threshold) {
      warnings.push({ tone: "danger", title: hero.codinome, text: "Risco de recusa ou quebra de ordem se a missão cruzar sua linha moral." });
    }
  });

  return warnings.slice(0, 3);
};

export default function HeroSelectionPanel({ heroes, selectedIds, onToggleHero, isMissionAvailable, preview, event, onSend, dispatching, relationships, game }) {
  const idealSize = event?.nivelRisco >= 4 ? "3 - 4" : event?.dificuldade >= 62 ? "2 - 3" : "1 - 2";
  const selectedCount = selectedIds.length;
  const chance = preview?.chance ?? 0;
  const selectedHeroes = selectedIds.map((heroId) => heroes.find((hero) => hero.id === heroId)).filter(Boolean);
  const alphaWarnings = alphaWarningsFor(selectedHeroes, relationships, preview);
  const missionReactions =
    event && selectedHeroes.length && game
      ? calculateMissionReactions({ state: game, event, team: selectedHeroes, relationships, leaderId: selectedHeroes[0]?.id }).reactions
      : [];
  const synergyLabel = preview ? (chance >= 75 ? "Boa" : chance >= 55 ? "Instável" : "Frágil") : "Aguardando";

  return (
    <aside className="hero-selection-panel hero-selection-panel--ops">
      <header className="section-header compact">
        <div>
          <p className="eyebrow"><Users size={13} aria-hidden="true" /> Equipe disponível</p>
          <h3>{selectedCount}/3 selecionados</h3>
        </div>
        <button type="button">Gerenciar equipe</button>
      </header>

      <div className="dispatch-hero-list dispatch-hero-list--ops">
        {heroes.map((hero) => {
          const selected = selectedIds.includes(hero.id);
          const unavailable = !isMissionAvailable(hero) || (!selected && selectedIds.length >= 3);

          return (
            <article className={`dispatch-hero-card dispatch-hero-card--ops ${selected ? "selected" : ""} ${unavailable ? "unavailable" : ""}`} key={hero.id}>
              <img src={hero.imageUrl} alt="" />
              <div className="dispatch-hero-copy">
                <span className="hero-code">{initials(hero.codinome)}</span>
                <strong>{hero.codinome}</strong>
                <small>{formatHeroRole(hero.funcao)}</small>
                <div className="hero-vital-row">
                  <span>Energia <ProgressBar value={hero.energia} tone="energy" /></span>
                  <span>Estresse <ProgressBar value={hero.estresse} tone="stress" /></span>
                </div>
              </div>
              <div className="dispatch-hero-actions">
                <button disabled={unavailable} onClick={() => onToggleHero(hero.id)} type="button">
                  {selected ? "Remover" : "Designar"}
                </button>
                <StatusPill status={hero.status}>{formatStatusLabel(hero.status)}</StatusPill>
              </div>
            </article>
          );
        })}
      </div>

      <section className="suggested-scale" style={{ "--value": `${chance}%` }}>
        <header>
          <p className="eyebrow">Escala sugerida</p>
          <h3>{preview ? `${chance}%` : "--"}</h3>
          <span>{synergyLabel}</span>
        </header>
        <div className="scale-meter">
          <i />
        </div>
        <div className="scale-summary">
          <article><span>Tamanho ideal</span><strong>{idealSize}</strong><small>heróis</small></article>
          <article><span>Sinergia estimada</span><strong>{synergyLabel}</strong><small>{preview?.activeCombos?.[0]?.name ?? "Combinações em análise"}</small></article>
        </div>
      </section>

      {alphaWarnings.length ? (
        <section className="alpha-team-warnings">
          <p className="eyebrow">Leitura narrativa</p>
          {alphaWarnings.map((warning) => (
            <article className={`alpha-team-warning alpha-team-warning--${warning.tone}`} key={`${warning.title}-${warning.text}`}>
              <strong>{warning.title}</strong>
              <span>{warning.text}</span>
            </article>
          ))}
        </section>
      ) : null}

      {missionReactions.length ? (
        <section className="mission-reaction-panel">
          <p className="eyebrow">Reação antes do despacho</p>
          {missionReactions.map((reaction) => (
            <article className={`mission-reaction-card mission-reaction-card--${reaction.possibleRefusal ? "danger" : reaction.reactionScore >= 66 ? "good" : "warn"}`} key={reaction.heroId}>
              <header>
                <strong>{reaction.heroName}</strong>
                <span>{reaction.reactionScore}/100 · {reaction.band}</span>
              </header>
              <p>{reaction.spokenReaction}</p>
              <small>{reaction.positiveFactors[0] ?? "sem impulso positivo dominante"} · {reaction.negativeFactors[0] ?? "sem alerta negativo dominante"}</small>
              {reaction.possibleRefusal ? <em>risco de recusa exposto</em> : null}
            </article>
          ))}
        </section>
      ) : null}

      <button className="dispatch-submit-button" disabled={!selectedCount || dispatching} onClick={onSend} type="button">
        <Send size={28} aria-hidden="true" />
        <span>
          <strong>{dispatching ? "Despachando..." : "Despachar equipe"}</strong>
          <small>Envie heróis para esta ocorrência</small>
        </span>
        <ArrowRight size={22} aria-hidden="true" />
      </button>
    </aside>
  );
}
