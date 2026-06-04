import { baseUpgradeEffect } from "./baseUpgradeSystem";
import { normalizeVillainLifecycle } from "./villainLifecycleSystem";

const stages = ["avaliacao", "contencao", "depoimento", "reparacao", "teste_supervisionado", "missao_assistida", "aliado_condicional", "reformado"];

export const startRehabilitation = (villainId, gameState) => ({
  ...gameState,
  villains: gameState.villains.map((villain) =>
    villain.id === villainId ? { ...normalizeVillainLifecycle(villain), status: "em_reabilitacao", estadoAtual: "em reabilitacao", rehabilitationStage: stages[0] } : villain,
  ),
});

export const assignMentorHero = (gameState, villainId, heroId) => ({
  ...gameState,
  villains: gameState.villains.map((villain) =>
    villain.id === villainId ? { ...normalizeVillainLifecycle(villain), assignedMentorHeroId: heroId } : villain,
  ),
});

export const progressRehabilitation = (villain, mentorHero, dispatcher, baseUpgrades = []) => {
  const normalized = normalizeVillainLifecycle(villain);
  const empathy = (dispatcher?.attributes?.empatia ?? 5) + (mentorHero?.atributos?.carisma ?? 0);
  const progressDelta = Math.max(3, Math.round(6 + empathy * 0.8 + baseUpgradeEffect(baseUpgrades, "reformBonus") - (normalized.violencia ?? 2) * 2));
  const progress = Math.min(100, normalized.reformProgress + progressDelta);
  const stageIndex = Math.min(stages.length - 1, Math.floor(progress / 14));
  return {
    ...normalized,
    reformProgress: progress,
    reformTrust: Math.min(100, normalized.reformTrust + Math.round(empathy * 0.3)),
    reformRisk: Math.max(3, normalized.reformRisk - Math.round(empathy * 0.2)),
    rehabilitationStage: stages[stageIndex],
    status: progress >= 100 ? "reformado" : "em_reabilitacao",
    estadoAtual: progress >= 100 ? "reformado" : "em reabilitacao",
    informante: progress >= 55 ? true : normalized.informante,
  };
};

export const checkRehabilitationEvent = (villain, gameState) => {
  const normalized = normalizeVillainLifecycle(villain);
  if (normalized.reformRisk > 75 && (gameState.day + normalized.id.length) % 6 === 0) {
    return { type: "relapse", villainId: villain.id, text: `${villain.alcunha} teve recaída durante o programa de reforma.` };
  }
  if (normalized.reformProgress >= 70 && !normalized.informante) {
    return { type: "breakthrough", villainId: villain.id, text: `${villain.alcunha} entregou uma pista útil sobre facções.` };
  }
  return null;
};

export const completeRehabilitation = (villain, outcome = "reformado") => ({
  ...normalizeVillainLifecycle(villain),
  status: outcome,
  estadoAtual: outcome === "reformado" ? "reformado" : "em reabilitacao",
  reformProgress: outcome === "reformado" ? 100 : villain.reformProgress,
});

export const generateReformedVillainApplicant = (villain) => ({
  id: `app-reformado-${villain.id}`,
  codinome: `Ex-${villain.alcunha}`,
  nomeCivil: villain.nome,
  idade: 32,
  arquetipo: "anti-herói em reparação",
  poder: villain.poderesRecursos?.[0] ?? "experiência de rua",
  biografia: `${villain.alcunha} busca uma segunda chance supervisionada pela Central.`,
  atributos: { forca: 6, mobilidade: 5, controle: 5, investigacao: 6, carisma: 4, resistencia: 7 },
  tracosPositivos: ["conhece o submundo", "quer reparar danos"],
  tracosNegativos: ["passado público", "confiança frágil"],
  expectativaSalarial: 5200,
  custoContratacao: 8000,
  riscoComportamental: "alto",
  compatibilidade: 48,
  imageUrl: villain.imageUrl,
  status: "novo",
});
