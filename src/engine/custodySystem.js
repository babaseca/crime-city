import custodyActions from "../data/custodyActions.json";
import { baseUpgradeEffect } from "./baseUpgradeSystem";
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
  const escapes = [];
  const villains = (gameState.villains ?? []).map((villain) => {
    const normalized = normalizeVillainLifecycle(villain);
    if (!["capturado", "preso", "em_julgamento", "em_reabilitacao"].includes(normalized.status)) return normalized;
    const risk = calculateEscapeRisk(normalized, gameState.baseUpgrades);
    if (risk > 70 && (gameState.day + normalized.id.length) % 9 === 0) {
      escapes.push(normalized);
      return { ...normalized, status: "fugitivo", estadoAtual: "fugitivo", escapeCount: normalized.escapeCount + 1 };
    }
    if (normalized.status === "em_julgamento" && (gameState.day + normalized.id.length) % 4 === 0) return resolveTrial(normalized, gameState);
    return normalized;
  });
  return { ...gameState, villains, custodyEvents: [...escapes.map((villain) => ({ day: gameState.day, villainId: villain.id, type: "escape" })), ...(gameState.custodyEvents ?? [])].slice(0, 40) };
};

export const applyCustodyAction = (villainId, actionId, gameState) => {
  const action = custodyActions.find((candidate) => candidate.id === actionId);
  if (!action) return { state: gameState, message: "Ação não encontrada." };
  if (gameState.budget < action.cost) return { state: gameState, message: "Orçamento insuficiente para custódia." };
  const villains = gameState.villains.map((villain) => {
    if (villain.id !== villainId) return villain;
    const normalized = normalizeVillainLifecycle(villain);
    const status =
      actionId === "julgamento"
        ? "em_julgamento"
        : actionId === "reabilitacao"
          ? "em_reabilitacao"
          : actionId === "informante"
            ? "informante"
            : actionId === "seguranca_maxima"
              ? "preso"
              : normalized.status;
    return {
      ...normalized,
      status,
      estadoAtual: status,
      informante: actionId === "informante" ? true : normalized.informante,
      informantStatus: actionId === "informante" ? "ativo" : normalized.informantStatus,
      riscoFuga: Math.max(1, Math.min(95, (normalized.riscoFuga ?? 20) + action.escapeRiskChange)),
      publicResistance: Math.max(0, Math.min(100, (normalized.publicResistance ?? 20) + action.publicPressureChange)),
      prisonSecurityLevel: actionId === "seguranca_maxima" ? Math.min(5, (normalized.prisonSecurityLevel ?? 1) + 2) : normalized.prisonSecurityLevel,
      reformAttempts: actionId === "reabilitacao" ? normalized.reformAttempts + 1 : normalized.reformAttempts,
    };
  });
  return {
    state: {
      ...gameState,
      villains,
      budget: gameState.budget - action.cost,
      budgetLog: [...(gameState.budgetLog ?? []), { id: `budget-custody-${villainId}-${Date.now()}`, day: gameState.day, type: "expense", label: `Custódia: ${action.label}`, amount: action.cost }],
    },
    message: `${action.label} registrada no dossiê.`,
  };
};
