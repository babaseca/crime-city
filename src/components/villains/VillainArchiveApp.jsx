import { useEffect, useMemo, useState } from "react";
import { FileWarning, Gavel, LockKeyhole, MessageSquareWarning, ShieldAlert, Skull, UserCheck } from "lucide-react";
import { applyCustodyAction } from "../../engine/custodySystem";
import { performInterrogation } from "../../engine/interrogationSystem";
import { formatFactionName, formatMoney, formatStatusLabel, safeList } from "../../utils/formatters";
import Button from "../common/Button";
import ProgressBar from "../common/ProgressBar";
import RiskBadge from "../common/RiskBadge";
import StatusPill from "../common/StatusPill";
import VillainCard from "./VillainCard";

const tabs = [
  ["todos", "Todos"],
  ["capturado", "Capturados"],
  ["em reforma", "Em reforma"],
  ["reformado", "Reformados"],
  ["fugitivo", "Fugitivos"],
];

const matchesTab = (villain, tab) => {
  const status = villain.estadoAtual ?? villain.status;
  if (tab === "todos") return true;
  if (tab === "capturado") return ["capturado", "preso"].includes(status);
  if (tab === "em reforma") return ["em reabilitação", "em reabilitacao", "em_reabilitacao"].includes(status);
  return status === tab;
};

const actionCopy = {
  manter_preso: "Custo baixo, reduz fuga de forma discreta.",
  seguranca_maxima: "Caro, mas recomendado para alvos instáveis.",
  julgamento: "Move pressão para o sistema legal e gera registro público.",
  reabilitacao: "Aposta narrativa: pode virar aliado, informante ou crise.",
  informante: "Tenta trocar informação por controle supervisionado.",
};

export default function VillainArchiveApp({ game, setGame }) {
  const [tab, setTab] = useState("todos");
  const [selectedVillainId, setSelectedVillainId] = useState(null);
  const [message, setMessage] = useState("");
  const villains = useMemo(() => game.villains.filter((villain) => matchesTab(villain, tab)), [game.villains, tab]);
  const selectedVillain = villains.find((villain) => villain.id === selectedVillainId) ?? villains[0] ?? null;

  useEffect(() => {
    if (selectedVillain && selectedVillain.id !== selectedVillainId) setSelectedVillainId(selectedVillain.id);
  }, [selectedVillain, selectedVillainId]);

  const custodyAction = (id, actionId) => {
    setGame((current) => {
      const result = applyCustodyAction(id, actionId, current);
      setMessage(result.message);
      return result.state;
    });
  };

  const interrogate = (id) => {
    setGame((state) => {
      const result = performInterrogation(state, id, "tecnica");
      setMessage(result.message);
      return result.state;
    });
  };

  const factionName = selectedVillain?.associatedFactionId
    ? formatFactionName(selectedVillain.associatedFactionId, game.factions)
    : selectedVillain?.faccao ?? "Sem facção conhecida";

  return (
    <div className="villain-app">
      <header className="module-hero danger villain-hero">
        <div>
          <p className="eyebrow"><Skull size={14} aria-hidden="true" /> Arquivo de Vilões</p>
          <h2>Dossiês, custódia e reforma</h2>
          <p>Quem escapa vira manchete. Quem muda de lado vira problema político. O arquivo precisa prever os dois.</p>
        </div>
      </header>

      {message ? <p className="system-message">{message}</p> : null}

      <div className="tab-strip villain-tabs">
        {tabs.map(([id, label]) => <button className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)} type="button">{label}</button>)}
      </div>

      <div className="villain-archive-layout">
        <aside className="villain-list-panel">
          <div className="section-header compact">
            <div>
              <p className="eyebrow">lista resumida</p>
              <h3>{villains.length} registros</h3>
            </div>
          </div>
          <div className="villain-list">
            {villains.map((villain) => (
              <VillainCard
                key={villain.id}
                onSelect={(record) => setSelectedVillainId(record.id)}
                selected={villain.id === selectedVillain?.id}
                villain={villain}
              />
            ))}
          </div>
        </aside>

        <section className="villain-dossier-panel">
          {selectedVillain ? (
            <>
              <header className="dossier-header">
                <img src={selectedVillain.imageUrl} alt="" />
                <div>
                  <p className="eyebrow">dossiê operacional</p>
                  <h2>{selectedVillain.alcunha}</h2>
                  <span>{selectedVillain.nome}</span>
                </div>
                <StatusPill status={selectedVillain.estadoAtual}>{formatStatusLabel(selectedVillain.estadoAtual)}</StatusPill>
              </header>

              <div className="dossier-metrics">
                <span>Periculosidade <RiskBadge level={selectedVillain.periculosidade} /></span>
                <span>Bairro <strong>{selectedVillain.bairroAtuacao ?? "Sem território fixo"}</strong></span>
                <span>Facção <strong>{factionName}</strong></span>
                <span>Rancor <strong>{selectedVillain.grudgeAgainstCentral ?? 0}/100</strong></span>
              </div>

              <article className="dossier-block">
                <h3>Recursos e padrões</h3>
                <p>{selectedVillain.poderesRecursos ?? "Recursos ainda em levantamento pela Central."}</p>
                <p><strong>Crimes conhecidos:</strong> {safeList(selectedVillain.crimesConhecidos, "Sem crimes formalizados no arquivo.")}</p>
                <p><strong>Personalidade:</strong> {safeList(selectedVillain.personalidade, "Perfil psicológico incompleto.")}</p>
              </article>

              <div className="villain-detail-bars">
                <span>Risco de fuga <ProgressBar value={selectedVillain.riscoFuga} tone="death" /></span>
                <span>Chance de reforma <ProgressBar value={selectedVillain.chanceReforma} tone="compat" /></span>
                <span>Progresso de reforma <ProgressBar value={selectedVillain.reformProgress ?? 0} tone="compat" /></span>
              </div>

              <section className="timeline-list dossier-history">
                <h3>Histórico recente</h3>
                {selectedVillain.historicoEncontros?.length ? selectedVillain.historicoEncontros.slice(0, 5).map((item, index) => (
                  <p key={`${item.day}-${index}`}><span>Dia {item.day} · {item.eventTitle}</span><strong>{item.result}</strong></p>
                )) : <p className="muted">Nenhum encontro registrado ainda.</p>}
              </section>
            </>
          ) : (
            <div className="empty-dossier">
              <FileWarning size={28} aria-hidden="true" />
              <p>Nenhum dossiê nesta categoria.</p>
            </div>
          )}
        </section>

        <aside className="villain-action-panel">
          <p className="eyebrow">decisões disponíveis</p>
          {selectedVillain ? (
            <>
              <Button variant="secondary" icon={MessageSquareWarning} onClick={() => interrogate(selectedVillain.id)}>Interrogar</Button>
              <Button icon={UserCheck} onClick={() => custodyAction(selectedVillain.id, "reabilitacao")}>Tentar reabilitação</Button>
              <Button variant="secondary" icon={LockKeyhole} onClick={() => custodyAction(selectedVillain.id, "manter_preso")}>Manter preso</Button>
              <Button variant="secondary" icon={Gavel} onClick={() => custodyAction(selectedVillain.id, "julgamento")}>Enviar a julgamento</Button>
              <Button variant="secondary" icon={UserCheck} onClick={() => custodyAction(selectedVillain.id, "informante")}>Usar como informante</Button>
              <Button variant="danger" icon={ShieldAlert} onClick={() => custodyAction(selectedVillain.id, "seguranca_maxima")}>Segurança máxima</Button>
              <div className="custody-cost-note">
                <strong>Orçamento disponível</strong>
                <span>{formatMoney(game.budget)}</span>
              </div>
              {Object.entries(actionCopy).map(([id, text]) => <p className="action-hint" key={id}>{text}</p>)}
            </>
          ) : (
            <p className="muted">Selecione um registro para ver ações.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
