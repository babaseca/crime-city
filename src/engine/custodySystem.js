import custodyActions from "../data/custodyActions.json";
import {
  appendCaseAudit,
  ensureAlphaCaseState,
  generateProgressReport,
  getCaseForVillain,
  maybeEscapeCase,
  updateCaseRecord,
} from "./alphaCaseSystem";
import { baseUpgradeEffect } from "./baseUpgradeSystem";
import { calculateScaledCost } from "./economySystem";
import { makeAuditEvent } from "./seededRng";
import { normalizeVillainLifecycle } from "./villainLifecycleSystem";

export const calculateEscapeRisk = (villain, baseUpgrades = []) => {
  const normalized = normalizeVillainLifecycle(villain);
  const base = normalized.riscoFuga ?? normalized.riskFuga ?? 20;
  const security = (normalized.prisonSecurityLevel ?? 1) * 7;
  return Math.max(1, Math.min(95, base + normalized.grudgeAgainstCentral * 0.12 - security - baseUpgradeEffect(baseUpgrades, "escapeRiskReduction")));
};

export const resolveTrial = (villain, gameState) => {
  const normalized = normalizeVillainLifecycle(villain);
  const pressure = gameState.reputation > 65 ? -4 : 6;
  return {
    ...normalized,
    status: "preso",
    estadoAtual: "preso",
    trialStatus: normalized.threatLevel + pressure > 55 ? "condenado" : "acordo_supervisionado",
    prisonSecurityLevel: normalized.threatLevel > 70 ? 3 : 2,
  };
};

export const applyCustodyDailyTick = (gameState) => {
  const alphaState = ensureAlphaCaseState(gameState);
  const escapes = [];
  let caseRecords = alphaState.caseRecords ?? [];
  const alphaEscapes = [];
  caseRecords = caseRecords.map((record) => {
    const escape = maybeEscapeCase(alphaState, record);
    if (!escape) return record;
    alphaEscapes.push(escape);
    return {
      ...record,
      status: "escaped",
      custody: {
        ...record.custody,
        incidentIds: [escape.id, ...(record.custody?.incidentIds ?? [])],
        failedControls: escape.failedControls,
      },
      auditLog: [
        makeAuditEvent({
          type: "CUSTODY_ESCAPE",
          summary: `Fuga por ${escape.vector}; controles falhos: ${escape.failedControls.join(", ")}.`,
          day: alphaState.day,
          tick: (alphaState.alphaEventLog?.length ?? 0) + 1,
          causationId: record.caseId,
          correlationId: escape.id,
          payload: escape,
        }),
        ...(record.auditLog ?? []),
      ].slice(0, 80),
    };
  });
  const villains = (alphaState.villains ?? []).map((villain) => {
    const normalized = normalizeVillainLifecycle(villain);
    const alphaEscape = alphaEscapes.find((escape) => escape.villainId === normalized.id);
    if (alphaEscape) {
      escapes.push(normalized);
      return { ...normalized, status: "fugitivo", estadoAtual: "fugitivo", escapeCount: normalized.escapeCount + 1, visibility: "fugitivo" };
    }
    if (!["capturado", "preso", "em_julgamento", "em_reabilitacao"].includes(normalized.status)) return normalized;
    const risk = calculateEscapeRisk(normalized, gameState.baseUpgrades);
    if (risk > 70 && (gameState.day + normalized.id.length) % 9 === 0) {
      escapes.push(normalized);
      return { ...normalized, status: "fugitivo", estadoAtual: "fugitivo", escapeCount: normalized.escapeCount + 1, visibility: "fugitivo" };
    }
    if (normalized.status === "em_julgamento" && (gameState.day + normalized.id.length) % 4 === 0) return resolveTrial(normalized, gameState);
    return normalized;
  });

  return {
    ...alphaState,
    villains,
    caseRecords,
    knownVillainIds: [...new Set([...(gameState.knownVillainIds ?? []), ...escapes.map((villain) => villain.id)])],
    custodyEvents: [
      ...alphaEscapes,
      ...escapes.map((villain) => ({ day: gameState.day, villainId: villain.id, type: "escape" })),
      ...(gameState.custodyEvents ?? []),
    ].slice(0, 40),
    alphaEventLog: [
      ...alphaEscapes.map((escape) =>
        makeAuditEvent({
          type: "CUSTODY_ESCAPE",
          summary: `Fuga registrada: ${escape.vector}.`,
          day: gameState.day,
          causationId: escape.caseId,
          correlationId: escape.id,
          payload: escape,
        }),
      ),
      ...(alphaState.alphaEventLog ?? []),
    ].slice(0, 300),
  };
};

export const custodyActionCost = (action) =>
  calculateScaledCost(action?.cost ?? 0, action?.id === "reabilitacao" ? "reformProgramCostMultiplier" : "treatmentCostMultiplier");

export const applyCustodyAction = (villainId, actionId, gameState) => {
  const prepared = ensureAlphaCaseState(gameState);
  const action = custodyActions.find((candidate) => candidate.id === actionId);
  if (!action) return { state: prepared, message: "Ação não encontrada." };
  const cost = custodyActionCost(action);
  if (prepared.budget < cost) return { state: prepared, message: "Orçamento insuficiente para custódia." };
  const caseRecord = getCaseForVillain(prepared, villainId);
  const villains = prepared.villains.map((villain) => {
    if (villain.id !== villainId) return villain;
    const normalized = normalizeVillainLifecycle(villain);
    const status =
      actionId === "julgamento"
        ? "em_julgamento"
        : actionId === "reabilitacao"
          ? "em_reabilitacao"
          : actionId === "informante"
            ? "informante"
            : actionId === "segurança_maxima"
              ? "preso"
              : normalized.status;
    return {
      ...normalized,
      status,
      estadoAtual: status,
      visibility: status,
      informante: actionId === "informante" ? true : normalized.informante,
      informantStatus: actionId === "informante" ? "ativo" : normalized.informantStatus,
      riscoFuga: Math.max(1, Math.min(95, (normalized.riscoFuga ?? 20) + action.escapeRiskChange)),
      publicResistance: Math.max(0, Math.min(100, (normalized.publicResistance ?? 20) + action.publicPressureChange)),
      prisonSecurityLevel: actionId === "segurança_maxima" ? Math.min(5, (normalized.prisonSecurityLevel ?? 1) + 2) : normalized.prisonSecurityLevel,
      reformAttempts: actionId === "reabilitacao" ? normalized.reformAttempts + 1 : normalized.reformAttempts,
    };
  });
  const nextStatus =
    actionId === "julgamento"
      ? "trial_pending"
      : actionId === "reabilitacao"
        ? "rehabilitation"
        : actionId === "informante"
          ? "informant_active"
          : actionId === "segurança_maxima" || actionId === "manter_preso"
            ? "holding"
            : caseRecord?.status ?? "captured";
  const event = makeAuditEvent({
    type: "CUSTODY_ACTION_APPLIED",
    summary: `${action.label} registrada com custo e efeito persistente.`,
    day: prepared.day,
    tick: (prepared.alphaEventLog?.length ?? 0) + 1,
    causationId: caseRecord?.caseId,
    correlationId: `custody-${villainId}-${actionId}-${prepared.day}`,
    payload: { villainId, actionId, cost },
  });
  let stateWithCase = {
    ...prepared,
    villains,
    knownVillainIds: [...new Set([...(prepared.knownVillainIds ?? []), villainId])],
    budget: prepared.budget - cost,
    budgetLog: [...(prepared.budgetLog ?? []), { id: `budget-custody-${villainId}-${Date.now()}`, day: prepared.day, type: "expense", label: `Custódia: ${action.label}`, amount: cost }],
  };

  if (caseRecord) {
    stateWithCase = updateCaseRecord(stateWithCase, caseRecord.caseId, (record) => ({
      ...record,
      status: nextStatus,
      custody: {
        ...record.custody,
        securityLevel: actionId === "segurança_maxima" ? "S5" : record.custody?.securityLevel ?? "S3",
        grievance: Math.max(0, Math.min(100, (record.custody?.grievance ?? 20) + (actionId === "segurança_maxima" ? 8 : action.publicPressureChange ?? 0))),
        escapeRisk: Math.max(1, Math.min(100, (record.custody?.escapeRisk ?? 35) + (action.escapeRiskChange ?? 0))),
      },
      rehabilitation:
        actionId === "reabilitacao"
          ? { ...record.rehabilitation, stage: record.rehabilitation?.stage === "precontemplation" ? "contemplation" : record.rehabilitation?.stage ?? "contemplation" }
          : record.rehabilitation,
      informant:
        actionId === "informante"
          ? {
              motivation: "sentence_reduction",
              reliability: Math.max(20, 70 - (record.custody?.grievance ?? 20)),
              access: Math.max(35, 85 - (record.custody?.securityNeed ?? 40) / 2),
              exposure: 44,
              doubleAgentRisk: Math.max(18, record.relapse?.currentRisk ?? 40),
              handlerHeroId: null,
              backupHandlerHeroId: null,
              safetyPlan: ["corroboração independente", "canal de extracao"],
            }
          : record.informant,
    }));
    stateWithCase = appendCaseAudit(stateWithCase, caseRecord.caseId, event);
    if (actionId === "reabilitacao") {
      const report = generateProgressReport(stateWithCase, getCaseForVillain(stateWithCase, villainId));
      stateWithCase = { ...stateWithCase, progressReports: [report, ...(stateWithCase.progressReports ?? [])].slice(0, 120) };
    }
  }

  return {
    state: stateWithCase,
    message: `${action.label} registrada no dossiê.`,
  };
};


