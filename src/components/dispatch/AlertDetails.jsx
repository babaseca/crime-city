import { AlertTriangle, Clock3, HelpCircle, MapPinned, RadioTower, ShieldAlert, Swords, Users } from "lucide-react";
import { getOccurrenceVisual } from "../../data/occurrenceVisuals";
import { attributeLabels } from "../../engine/mission";
import { moralSummaryLabel } from "../../engine/moralSystem";
import { relationshipLabel, relationshipProfile, relationshipValue } from "../../engine/relationships";
import { formatFactionName, titleCase } from "../../utils/formatters";
import RiskBadge from "../common/RiskBadge";

const riskToCivilianLabel = (risk) => (risk >= 4 ? "Alto" : risk >= 3 ? "Médio" : "Controlado");

export default function AlertDetails({ event, team, preview, relationships, game }) {
  if (!event) {
    return (
      <section className="alert-details alert-details--ops empty">
        <h3>Nenhum alerta selecionado</h3>
        <p>Escolha uma ocorrência no radar para abrir a triagem tática.</p>
      </section>
    );
  }

  const pairs = [];
  for (let i = 0; i < team.length; i += 1) {
    for (let j = i + 1; j < team.length; j += 1) {
      const value = relationshipValue(relationships, team[i].id, team[j].id);
      const axes = relationshipProfile(relationships, team[i].id, team[j].id);
      pairs.push({ names: `${team[i].codinome} + ${team[j].codinome}`, value, label: relationshipLabel(value), axes });
    }
  }

  const district = game?.districts?.find((item) => item.id === event.districtId || item.name === event.bairro);
  const factionLabel = event.factionId ? formatFactionName(event.factionId, game?.factions ?? []) : "Sem facção suspeita";
  const warning = preview?.deathRisk >= 12 || preview?.injuryRisk >= 28 || (event.nivelRisco ?? 0) >= 4;
  const civilianRisk = riskToCivilianLabel(event.nivelRisco ?? 1);
  const visual = getOccurrenceVisual(event);
  const moralAnalysis = preview?.moralAnalysis ?? null;
  const displayTags = (event.tags ?? []).filter((tag) => !/^alpha\d+/i.test(tag));
  const primaryTag = displayTags[0] ?? event.tags?.[0];

  return (
    <section className="alert-details alert-details--ops">
      <header className="selected-alert-header">
        <figure className={`selected-alert-media selected-alert-media--${visual.tone}`}>
          <img src={visual.src} alt={visual.alt} />
          <span className="selected-alert-icon"><AlertTriangle size={30} aria-hidden="true" /></span>
          <figcaption>{visual.label}</figcaption>
        </figure>
        <div>
          <p className="eyebrow">Ocorrência selecionada</p>
          <small>{event.bairro}</small>
          <h2>{event.titulo}</h2>
          <p><MapPinned size={14} aria-hidden="true" /> {district?.name ?? event.bairro} · {factionLabel}</p>
        </div>
        <RiskBadge level={event.nivelRisco} />
      </header>

      <p className="selected-alert-description">{event.descricao}</p>

      <div className="selected-alert-metrics">
        <article>
          <span>Dificuldade</span>
          <strong>{event.dificuldade}</strong>
          <small>{event.dificuldade >= 68 ? "Alta" : event.dificuldade >= 55 ? "Média" : "Baixa"}</small>
        </article>
        <article>
          <span>Facção suspeita</span>
          <strong>{factionLabel}</strong>
          <small>{event.factionId ? "Atividade confirmada" : "Sem assinatura"}</small>
        </article>
        <article>
          <span>Risco para civis</span>
          <strong>{civilianRisk}</strong>
          <small>{event.tags?.includes("civis") ? "População próxima" : "Área monitorada"}</small>
        </article>
        <article>
          <span>Valores da equipe</span>
          <strong>{moralSummaryLabel(moralAnalysis)}</strong>
          <small>{moralAnalysis ? `bônus ${moralAnalysis.bonus > 0 ? "+" : ""}${moralAnalysis.bonus} · tensão ${moralAnalysis.tensionRisk}` : "Selecione heróis"}</small>
        </article>
      </div>

      <section className="triage-panel">
        <header>
          <div>
            <p className="eyebrow">Triagem tática</p>
            <h3>Classificação dinâmica deste evento</h3>
          </div>
          <HelpCircle size={18} aria-hidden="true" />
        </header>
        <div className="triage-chip-stack">
          <span className="triage-chip triage-chip--danger"><Users size={15} aria-hidden="true" /> Risco a civis <strong>{civilianRisk}</strong></span>
          <span className="triage-chip triage-chip--warn"><Clock3 size={15} aria-hidden="true" /> Tempo crítico <strong>{event.limiteTempoNarrativo}</strong></span>
          <span className="triage-chip triage-chip--amber"><Swords size={15} aria-hidden="true" /> Infraestrutura <strong>{primaryTag ? titleCase(primaryTag) : "Importante"}</strong></span>
          <span className="triage-chip triage-chip--info"><RadioTower size={15} aria-hidden="true" /> Facção suspeita <strong>{factionLabel}</strong></span>
          <span className="triage-chip triage-chip--cyan"><ShieldAlert size={15} aria-hidden="true" /> Ambiente hostil <strong>{displayTags.slice(0, 2).map(titleCase).join(", ") || "Monitorado"}</strong></span>
        </div>
      </section>

      <section className="recommended-roles">
        <h3>Papéis recomendados</h3>
        <div>
          {(event.requisitosPrincipais ?? []).map((requirement) => (
            <span className="role-token" key={requirement}>{attributeLabels[requirement] ?? titleCase(requirement)}</span>
          ))}
          {displayTags.slice(0, 3).map((tag) => <span className="role-token secondary" key={tag}>{titleCase(tag)}</span>)}
        </div>
      </section>

      <section className="command-recommendation">
        <span><RadioTower size={20} aria-hidden="true" /></span>
        <div>
          <strong>Recomendação do Comando</strong>
          <p>
            {preview
              ? preview.chance >= 75
                ? "Resposta rápida recomendada. A janela de sucesso está favorável."
                : preview.chance >= 50
                  ? "Resposta viável, mas revise fadiga e sinergia antes do despacho."
                  : "Risco elevado. O Comando recomenda reforçar a equipe antes de transmitir a ordem."
              : "Monte uma equipe para calcular sinergia, risco de ferimento e janela de sucesso."}
          </p>
        </div>
      </section>

      {pairs.length ? (
        <section className="field-relations">
          <h3>Sinergias em campo</h3>
          {pairs.map((pair) => (
            <p key={pair.names}>
              <span>{pair.names}</span>
              <strong>{pair.value > 0 ? "+" : ""}{pair.value} · {pair.label}</strong>
              <small>confiança {pair.axes.trust} · respeito {pair.axes.respect} · proximidade {pair.axes.closeness} · tensão {pair.axes.tension}</small>
            </p>
          ))}
        </section>
      ) : null}

      {moralAnalysis?.pairFriction?.length || moralAnalysis?.heroFits?.some((fit) => fit.notes?.length) ? (
        <section className="moral-pressure-panel">
          <h3>Pressão moral prevista</h3>
          {moralAnalysis.pairFriction.map((friction) => (
            <p key={friction.heroIds.join("-")}>
              <span>{friction.names.join(" + ")}</span>
              <strong>tensão {friction.score}</strong>
              <small>{friction.notes.join(", ")}</small>
            </p>
          ))}
          {moralAnalysis.heroFits
            .filter((fit) => fit.notes?.length)
            .map((fit) => (
              <p key={fit.heroId}>
                <span>{fit.heroName}</span>
                <strong>{fit.bonus > 0 ? "+" : ""}{fit.bonus}</strong>
                <small>{fit.notes.join(", ")}</small>
              </p>
            ))}
        </section>
      ) : null}

      {warning ? (
        <div className="dispatch-danger-note">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>Alerta tático: risco real de ferimento grave ou falha pública. Use equipe com cobertura complementar.</p>
        </div>
      ) : null}
    </section>
  );
}
