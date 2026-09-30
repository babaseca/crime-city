import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DollarSign,
  FileWarning,
  Gavel,
  LockKeyhole,
  MessageSquareWarning,
  Radar,
  Search,
  ShieldAlert,
  Skull,
  UserCheck,
} from "lucide-react";
import { applyCustodyAction } from "../../engine/custodySystem";
import { performInterrogation } from "../../engine/interrogationSystem";
import { corroborateIntel, generateProgressReport, getCaseForVillain, getIntelForCase, getSessionsForCase } from "../../engine/alphaCaseSystem";
import { formatFactionName, formatMoney, formatStatusLabel, safeList, titleCase } from "../../utils/formatters";
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

const getStatus = (villain) => villain.estadoAtual ?? villain.status;

const matchesTab = (villain, tab) => {
  const status = getStatus(villain);
  if (tab === "todos") return true;
  if (tab === "capturado") return ["capturado", "preso"].includes(status);
  if (tab === "em reforma") return ["em reabilitação", "em reabilitacao", "em_reabilitacao"].includes(status);
  return status === tab;
};

const actionNotes = [
  ["Custódia", "Manter preso reduz fuga sem virar manchete."],
  ["Reforma", "A reabilitação pode render aliado, informante ou crise política."],
  ["Julgamento", "O processo público move pressão para o sistema legal."],
];

const dossierTabs = [
  ["case", "Caso"],
  ["intel", "Inteligência"],
  ["interrogation", "Interrogatório"],
  ["custody", "Custódia"],
  ["rehab", "Segunda chance"],
  ["informant", "Informante"],
];

const caseEventLabels = {
  CASE_CREATED: "Dossiê criado",
  DEMO_STATE: "Estado inicial",
  CUSTODY_INTAKE_COMPLETED: "Entrada em custódia",
  CUSTODY_INCIDENT: "Incidente de custódia",
  ESCAPE_ATTEMPTED: "Tentativa de fuga",
  ESCAPE_COMPLETED: "Fuga confirmada",
  INTERROGATION_STARTED: "Interrogatório iniciado",
  INTERROGATION_RESOLVED: "Interrogatório resolvido",
  INTEL_CREATED: "Inteligência criada",
  INTEL_CORROBORATED: "Inteligência corroborada",
  INTEL_COMPROMISED: "Inteligência comprometida",
  REHAB_PLAN_CREATED: "Plano de reabilitação",
  REHAB_STAGE_CHANGED: "Etapa de reabilitação",
  INFORMANT_RECRUITED: "Informante recrutado",
  PROGRESS_REPORT_GENERATED: "Relatório gerado",
};

const formatCaseEvent = (eventType) => caseEventLabels[eventType] ?? titleCase(eventType ?? "sem evento");

const countByTab = (villains, tab) => villains.filter((villain) => matchesTab(villain, tab)).length;
const percent = (value) => Math.round(Number(value) || 0);
const pageSize = 10;
const cleanFactionText = (value) => String(value ?? "").replace(/faccao/gi, "facção");

const isKnownVillain = (villain, knownIds) => {
  const visibility = villain.visibility ?? "desconhecido";
  if (knownIds.has(villain.id)) return true;
  return !["desconhecido", "unknown"].includes(visibility);
};

const isAlphaCampaignVillain = (villain) =>
  villain.isAlphaActiveVillain === true && villain.spawnEnabled !== false && villain.archivedLegacy !== true;

const matchesSearch = (villain, query) => {
  const term = query.trim().toLocaleLowerCase("pt-BR");
  if (!term) return true;
  return [
    villain.alcunha,
    villain.nome,
    villain.faccao,
    villain.bairroAtuacao,
    villain.poderesRecursos,
    ...(villain.crimesConhecidos ?? []),
    ...(villain.personalidade ?? []),
  ].some((value) => String(value ?? "").toLocaleLowerCase("pt-BR").includes(term));
};

export default function VillainArchiveApp({ game, setGame }) {
  const [tab, setTab] = useState("todos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedVillainId, setSelectedVillainId] = useState(null);
  const [dossierTab, setDossierTab] = useState("case");
  const [message, setMessage] = useState("");
  const rawVillains = game.villains ?? [];
  const knownIds = useMemo(() => new Set(game.knownVillainIds ?? game.knownVillains ?? []), [game.knownVillainIds, game.knownVillains]);
  const alphaCampaignVillains = useMemo(
    () => rawVillains.filter((villain) => isAlphaCampaignVillain(villain) && isKnownVillain(villain, knownIds)),
    [rawVillains, knownIds],
  );
  const allVillains = alphaCampaignVillains;
  const hiddenVillainCount = Math.max(0, rawVillains.length - alphaCampaignVillains.length);
  const villains = useMemo(
    () => allVillains.filter((villain) => matchesTab(villain, tab)).filter((villain) => matchesSearch(villain, search)),
    [allVillains, search, tab],
  );
  const totalPages = Math.max(1, Math.ceil(villains.length / pageSize));
  const pageVillains = useMemo(() => villains.slice((page - 1) * pageSize, page * pageSize), [villains, page]);
  const selectedVillain = villains.find((villain) => villain.id === selectedVillainId) ?? pageVillains[0] ?? villains[0] ?? null;
  const archiveStats = useMemo(
    () => ({
      captured: countByTab(allVillains, "capturado"),
      reforming: countByTab(allVillains, "em reforma"),
      reformed: countByTab(allVillains, "reformado"),
      fugitives: countByTab(allVillains, "fugitivo"),
    }),
    [allVillains],
  );
  const tabCounts = useMemo(
    () => tabs.map(([id, label]) => ({ id, label, count: countByTab(allVillains, id) })),
    [allVillains],
  );

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

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

  const interrogateWith = (id, approachId) => {
    setGame((state) => {
      const result = performInterrogation(state, id, approachId);
      setMessage(result.message);
      return result.state;
    });
  };

  const corroborateFirstIntel = () => {
    const intel = caseIntel[0];
    if (!intel) {
      setMessage("Nenhuma inteligência para corroborar.");
      return;
    }
    setGame((state) => {
      const result = corroborateIntel(state, intel.id);
      setMessage(result.message);
      return result.state;
    });
  };

  const createProgressReport = () => {
    if (!selectedCase) {
      setMessage("Nenhum caso ativo para relatório.");
      return;
    }
    setGame((state) => {
      const currentCase = getCaseForVillain(state, selectedCase.villainId);
      const report = generateProgressReport(state, currentCase);
      setMessage("Relatório de progresso gerado com fontes auditáveis.");
      return { ...state, progressReports: [report, ...(state.progressReports ?? [])].slice(0, 120) };
    });
  };

  const factionName = selectedVillain?.associatedFactionId
    ? formatFactionName(selectedVillain.associatedFactionId, game.factions)
    : cleanFactionText(selectedVillain?.faccao ?? "Sem facção conhecida");
  const selectedCase = selectedVillain ? getCaseForVillain(game, selectedVillain.id) : null;
  const caseIntel = getIntelForCase(game, selectedCase);
  const caseSessions = getSessionsForCase(game, selectedCase);
  const caseReports = (game.progressReports ?? []).filter((report) => report.caseId === selectedCase?.caseId);
  const escapeRisk = selectedVillain?.riscoFuga ?? selectedVillain?.riskFuga ?? 0;
  const reformChance = selectedVillain?.chanceReforma ?? 0;
  const reformProgress = selectedVillain?.reformProgress ?? 0;

  return (
    <div className="villain-app">
      <header className="villain-hero villain-archive-hero">
        <div className="villain-hero__copy">
          <p className="eyebrow"><Skull size={14} aria-hidden="true" /> Arquivo de Vilões</p>
          <h2>Dossiês, custódia e reforma</h2>
          <p>Quem escapa vira manchete. Quem muda de lado vira problema político. O arquivo precisa prever os dois.</p>
        </div>
        <div className="villain-hero__stats" aria-label="Resumo do arquivo">
          <span><strong>{archiveStats.fugitives}</strong><small>Fugitivos</small></span>
          <span><strong>{archiveStats.captured}</strong><small>Em custódia</small></span>
          <span><strong>{archiveStats.reforming}</strong><small>Em reforma</small></span>
          <span><strong>{archiveStats.reformed}</strong><small>Reformados</small></span>
        </div>
      </header>

      {message ? <p className="system-message">{message}</p> : null}

      <div className="tab-strip villain-tabs">
        {tabCounts.map(({ id, label, count }) => (
          <button className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)} type="button">
            <span>{label}</span>
            <strong>{count}</strong>
          </button>
        ))}
      </div>

      <div className="villain-filter-bar">
        <label className="search-box">
          <Search size={16} aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar dossiê, facção, bairro ou crime" />
        </label>
        <span><strong>{villains.length}</strong> visíveis</span>
        <span><strong>{hiddenVillainCount}</strong> arquivados</span>
      </div>

      <div className="villain-archive-layout">
        <aside className="villain-list-panel">
          <header className="villain-panel-heading">
            <div>
              <p className="eyebrow"><Archive size={13} aria-hidden="true" /> Registros ativos</p>
              <h3>{villains.length} registros</h3>
            </div>
            <span>{formatMoney(game.budget)}</span>
          </header>

          <div className="villain-list">
            {pageVillains.length ? pageVillains.map((villain) => (
              <VillainCard
                factions={game.factions ?? []}
                key={villain.id}
                onSelect={(record) => setSelectedVillainId(record.id)}
                selected={villain.id === selectedVillain?.id}
                villain={villain}
              />
            )) : (
              <div className="villain-empty-list">
                <FileWarning size={24} aria-hidden="true" />
                <strong>Nenhum registro nesta categoria.</strong>
                <span>Os arquivos filtrados aparecerão aqui quando houver movimentação.</span>
              </div>
            )}
          </div>

          {villains.length ? (
            <div className="pagination-controls compact">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} aria-label="Página anterior">
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <span>Página {page} de {totalPages}</span>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} aria-label="Próxima página">
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </aside>

        <section className="villain-dossier-panel">
          {selectedVillain ? (
            <>
              <header className="dossier-header">
                <div className="dossier-identity">
                  <img src={selectedVillain.imageUrl} alt="" />
                  <div>
                    <p className="eyebrow"><Radar size={13} aria-hidden="true" /> Dossiê operacional</p>
                    <h2>{selectedVillain.alcunha}</h2>
                    <span>{selectedVillain.nome}</span>
                  </div>
                </div>
                <div className="dossier-status-stack">
                  <StatusPill status={selectedVillain.estadoAtual}>{formatStatusLabel(selectedVillain.estadoAtual)}</StatusPill>
                  <RiskBadge level={selectedVillain.periculosidade} />
                </div>
              </header>

              <div className="dossier-metrics">
                <span><small>Bairro</small><strong>{selectedVillain.bairroAtuacao ?? "Sem território fixo"}</strong></span>
                <span><small>Facção</small><strong>{factionName}</strong></span>
                <span><small>Rancor</small><strong>{selectedVillain.grudgeAgainstCentral ?? 0}/100</strong></span>
                <span><small>Segurança</small><strong>Nível {selectedVillain.prisonSecurityLevel ?? 1}</strong></span>
              </div>

              <article className="dossier-block">
                <h3>Recursos e padrões</h3>
                <p>{selectedVillain.poderesRecursos ?? "Recursos ainda em levantamento pela Central."}</p>
                <p><strong>Crimes conhecidos:</strong> {safeList(selectedVillain.crimesConhecidos, "Sem crimes formalizados no arquivo.")}</p>
                <p><strong>Personalidade:</strong> {safeList(selectedVillain.personalidade, "Perfil psicológico incompleto.")}</p>
              </article>

              <div className="villain-detail-bars">
                <span>
                  <small>Risco de fuga <strong>{percent(escapeRisk)}%</strong></small>
                  <ProgressBar value={escapeRisk} tone="death" />
                </span>
                <span>
                  <small>Chance de reforma <strong>{percent(reformChance)}%</strong></small>
                  <ProgressBar value={reformChance} tone="compat" />
                </span>
                <span>
                  <small>Progresso de reforma <strong>{percent(reformProgress)}%</strong></small>
                  <ProgressBar value={reformProgress} tone="compat" />
                </span>
              </div>

              <section className="timeline-list dossier-history">
                <h3><Clock3 size={15} aria-hidden="true" /> Histórico recente</h3>
                {selectedVillain.historicoEncontros?.length ? selectedVillain.historicoEncontros.slice(0, 5).map((item, index) => (
                  <p key={`${item.day}-${index}`}><span>Dia {item.day} · {item.eventTitle}</span><strong>{item.result}</strong></p>
                )) : <p className="muted">Nenhum encontro registrado ainda.</p>}
              </section>

              <section className="alpha-case-console">
                <div className="tab-strip compact alpha-case-tabs">
                  {dossierTabs.map(([id, label]) => (
                    <button className={dossierTab === id ? "active" : ""} key={id} onClick={() => setDossierTab(id)} type="button">{label}</button>
                  ))}
                </div>

                {dossierTab === "case" ? (
                  <div className="alpha-case-grid">
                    <article><span>Status do caso</span><strong>{formatStatusLabel(selectedCase?.status)}</strong><small>{selectedCase?.caseId ?? "caso legado"}</small></article>
                    <article><span>Direitos e necessidades</span><strong>{selectedCase?.custody?.medicalNeeds?.[0] ?? "sem necessidade médica registrada"}</strong><small>{selectedCase?.custody?.separationNeeds?.[0] ?? "separação padrão"}</small></article>
                    <article><span>Linha do tempo</span><strong>{formatCaseEvent(selectedCase?.auditLog?.[0]?.eventType)}</strong><small>{selectedCase?.auditLog?.[0]?.summary ?? "aguardando movimentação"}</small></article>
                  </div>
                ) : null}

                {dossierTab === "intel" ? (
                  <div className="alpha-case-list">
                    {caseIntel.length ? caseIntel.slice(0, 6).map((intel) => (
                      <article key={intel.id}>
                        <strong>{titleCase(intel.state)} · {intel.confidence}%</strong>
                        <p>{intel.claim}</p>
                        <small>{intel.sourceType} / {intel.sourceId} · {intel.explanation?.join(" | ")}</small>
                      </article>
                    )) : <p className="muted">Nenhuma inteligência com proveniência registrada.</p>}
                  </div>
                ) : null}

                {dossierTab === "interrogation" ? (
                  <div className="alpha-case-list">
                    {caseSessions.length ? caseSessions.slice(0, 5).map((session) => (
                      <article key={session.sessionId}>
                        <strong>{session.approachLabel} · coop. {session.cooperation}%</strong>
                        <p>Confiabilidade {session.truthReliability}% · validade legal {session.legalValidity}% · rendimento {session.intelYield}%.</p>
                        <small>{session.falseIntelPossible ? "informação falsa possível" : "sem alerta forte de falsidade"}</small>
                      </article>
                    )) : <p className="muted">Nenhuma sessão registrada.</p>}
                  </div>
                ) : null}

                {dossierTab === "custody" ? (
                  <div className="alpha-case-grid">
                    <article><span>Segurança</span><strong>{selectedCase?.custody?.securityLevel ?? "não definida"}</strong><small>necessidade {selectedCase?.custody?.securityNeed ?? 0}/100</small></article>
                    <article><span>Pressão de fuga</span><strong>{selectedCase?.custody?.escapeRisk ?? escapeRisk}%</strong><small>agravo {selectedCase?.custody?.grievance ?? 0}/100</small></article>
                    <article><span>Controle falho</span><strong>{selectedCase?.custody?.failedControls?.[0] ?? "nenhum"}</strong><small>{selectedCase?.custody?.incidentIds?.[0] ?? "sem incidente"}</small></article>
                  </div>
                ) : null}

                {dossierTab === "rehab" ? (
                  <div className="alpha-case-list">
                    <article>
                      <strong>{titleCase(selectedCase?.rehabilitation?.stage ?? "precontemplation")}</strong>
                      <p>Responsabilidade {selectedCase?.rehabilitation?.dimensions?.accountability ?? 0}% · empatia {selectedCase?.rehabilitation?.dimensions?.empathy ?? 0}% · honestidade {selectedCase?.rehabilitation?.dimensions?.honesty ?? 0}%.</p>
                      <small>{caseReports[0]?.observations?.[0]?.observedFact ?? "relatório ainda não gerado"}</small>
                    </article>
                  </div>
                ) : null}

                {dossierTab === "informant" ? (
                  <div className="alpha-case-grid">
                    <article><span>Confiabilidade</span><strong>{selectedCase?.informant?.reliability ?? 0}%</strong><small>não equivale a reabilitação</small></article>
                    <article><span>Acesso</span><strong>{selectedCase?.informant?.access ?? 0}%</strong><small>exposição {selectedCase?.informant?.exposure ?? 0}%</small></article>
                    <article><span>Risco duplo</span><strong>{selectedCase?.informant?.doubleAgentRisk ?? 0}%</strong><small>{selectedCase?.informant ? "corroboração recomendada" : "não recrutado"}</small></article>
                  </div>
                ) : null}
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
          <header className="villain-panel-heading compact">
            <div>
              <p className="eyebrow"><Activity size={13} aria-hidden="true" /> Decisões disponíveis</p>
              <h3>Resposta da Central</h3>
            </div>
          </header>

          {selectedVillain ? (
            <>
              <div className="villain-action-stack">
                <Button variant="secondary" icon={MessageSquareWarning} onClick={() => interrogate(selectedVillain.id)}>Interrogar</Button>
                <Button variant="secondary" icon={MessageSquareWarning} onClick={() => interrogateWith(selectedVillain.id, "pressao_controlada")}>Pressão controlada</Button>
                <Button icon={UserCheck} onClick={() => custodyAction(selectedVillain.id, "reabilitacao")}>Tentar reabilitação</Button>
                <Button variant="secondary" icon={LockKeyhole} onClick={() => custodyAction(selectedVillain.id, "manter_preso")}>Manter preso</Button>
                <Button variant="secondary" icon={Gavel} onClick={() => custodyAction(selectedVillain.id, "julgamento")}>Enviar a julgamento</Button>
                <Button variant="secondary" icon={UserCheck} onClick={() => custodyAction(selectedVillain.id, "informante")}>Usar como informante</Button>
                <Button variant="secondary" icon={Radar} onClick={corroborateFirstIntel}>Corroborar intel</Button>
                <Button variant="secondary" icon={FileWarning} onClick={createProgressReport}>Gerar relatório</Button>
                <Button variant="danger" icon={ShieldAlert} onClick={() => custodyAction(selectedVillain.id, "seguranca_maxima")}>Segurança máxima</Button>
              </div>

              <div className="custody-cost-note villain-budget-card">
                <DollarSign size={18} aria-hidden="true" />
                <strong>Orçamento disponível</strong>
                <span>{formatMoney(game.budget)}</span>
              </div>

              <div className="villain-action-notes">
                {actionNotes.map(([label, text]) => (
                  <p className="action-hint" key={label}>
                    <strong>{label}</strong>
                    <span>{text}</span>
                  </p>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">Selecione um registro para ver ações.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
