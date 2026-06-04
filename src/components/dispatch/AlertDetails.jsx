import { AlertTriangle, HeartPulse, MapPinned, RadioTower, Send, ShieldAlert, Swords, Users } from "lucide-react";
import { attributeLabels } from "../../engine/mission";
import { relationTone, relationshipLabel, relationshipValue } from "../../engine/relationships";
import Button from "../common/Button";
import ProgressBar from "../common/ProgressBar";
import RiskBadge from "../common/RiskBadge";
import { formatFactionName, titleCase } from "../../utils/formatters";

export default function AlertDetails({ event, team, preview, relationships, onSend, game, dispatching = false }) {
  if (!event) {
    return (
      <section className="alert-details empty">
        <h3>Nenhum alerta selecionado</h3>
        <p>Escolha uma ocorrência no painel esquerdo para planejar a resposta.</p>
      </section>
    );
  }

  const pairs = [];
  for (let i = 0; i < team.length; i += 1) {
    for (let j = i + 1; j < team.length; j += 1) {
      const value = relationshipValue(relationships, team[i].id, team[j].id);
      pairs.push({ names: `${team[i].codinome} + ${team[j].codinome}`, value, label: relationshipLabel(value) });
    }
  }

  const warning = preview?.deathRisk >= 12 || preview?.injuryRisk >= 28;
  const district = game?.districts?.find((item) => item.id === event.districtId || item.name === event.bairro);
  const factionLabel = event.factionId ? formatFactionName(event.factionId, game?.factions ?? []) : "Sem facção suspeita";

  return (
    <section className="alert-details">
      <div className="details-heading">
        <div>
          <p className="eyebrow">ocorrência selecionada</p>
          <h2>{event.titulo}</h2>
        </div>
        <RiskBadge level={event.nivelRisco} />
      </div>
      <p className="details-description">{event.descricao}</p>
      <div className="details-grid">
        <span><MapPinned size={15} aria-hidden="true" /> {district?.name ?? event.bairro}</span>
        <span><RadioTower size={15} aria-hidden="true" /> {factionLabel}</span>
        <span><Swords size={15} aria-hidden="true" /> dificuldade {event.dificuldade}</span>
        <span><ShieldAlert size={15} aria-hidden="true" /> tempo: {event.limiteTempoNarrativo}</span>
        <span><Users size={15} aria-hidden="true" /> equipe: {team.length}/3</span>
      </div>
      <div className="chip-row">
        {event.requisitosPrincipais.map((requirement) => (
          <span className="chip requirement" key={requirement}>{attributeLabels[requirement]}</span>
        ))}
        {event.tags.map((tag) => <span className="chip" key={tag}>{titleCase(tag)}</span>)}
      </div>

      <Button className="send-mission-button top-action" icon={Send} disabled={!team.length || dispatching} onClick={onSend}>
        {dispatching ? "Enviando..." : "Enviar equipe"}
      </Button>

      {preview ? (
        <section className="mission-preview">
          <div className="chance-ring">
            <strong>{preview.chance}%</strong>
            <span>chance</span>
          </div>
          <div className="preview-breakdown">
            <p>Capacidade <strong>+{preview.capability}</strong></p>
            <p>Cansaço <strong>-{preview.fatiguePenalty}</strong></p>
            <p>Relação <strong>{preview.relationBonus >= 0 ? "+" : ""}{preview.relationBonus}</strong></p>
            <p>Função <strong>+{preview.roleBonus}</strong></p>
            <p>Dispatcher <strong>{preview.dispatcherBonus >= 0 ? "+" : ""}{preview.dispatcherBonus}</strong></p>
            <p>Central <strong>+{preview.upgradeBonus ?? 0}</strong></p>
          </div>
          <div className="expected-effects">
            <strong>Efeitos esperados</strong>
            <p>
              {preview.chance >= 75
                ? "Boa janela de sucesso. Dano colateral deve ficar administrável se a equipe mantiver ritmo."
                : preview.chance >= 50
                  ? "Operação viável, mas com margem pequena. Sinergias e descanso fazem diferença."
                  : "Resposta arriscada. Considere trocar heróis ou aceitar consequências no bairro."}
            </p>
            <span>{district ? `Impacto local: confiança ${district.trustInCentral}% · infraestrutura ${district.infrastructure}%` : "Impacto local será registrado após a missão."}</span>
          </div>
          {preview.activeCombos?.length ? (
            <div className="combo-preview">
              <strong>Sinergias ativas</strong>
              {preview.activeCombos.map((combo) => <span className="chip requirement" key={combo.id}>{combo.name}</span>)}
            </div>
          ) : null}
          <div className="risk-forecast">
            <span><HeartPulse size={15} aria-hidden="true" /> Lesão grave: <RiskBadge label={preview.woundRiskLabel} level={preview.woundRiskLabel} /></span>
            <span><AlertTriangle size={15} aria-hidden="true" /> Morte: <RiskBadge label={preview.deathRiskLabel} level={preview.deathRiskLabel} /></span>
          </div>
          <ProgressBar value={preview.injuryRisk} tone="injury" label="Risco de ferimento" />
          <ProgressBar value={preview.deathRisk * 2.5} tone="death" label="Risco de morte" />
          {warning ? (
            <div className="danger-warning">
              <AlertTriangle size={18} aria-hidden="true" />
              <p>Alerta tático: há risco real de lesão grave ou morte. Revise cansaço, ferimentos e compatibilidade antes de enviar.</p>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="mission-preview muted-preview">Selecione de 1 a 3 heróis para calcular a chance de sucesso.</section>
      )}

      <section className="pair-list">
        <h3>Relações em campo</h3>
        {pairs.length ? (
          pairs.map((pair) => (
            <p className={relationTone(pair.value)} key={pair.names}>
              <span>{pair.names}</span>
              <strong>{pair.value > 0 ? "+" : ""}{pair.value} · {pair.label}</strong>
            </p>
          ))
        ) : (
          <p className="muted">Duas ou mais pessoas revelam sinergias, piadas internas ou atritos.</p>
        )}
      </section>

    </section>
  );
}
