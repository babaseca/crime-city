export const villainStatuses = [
  "fugitivo",
  "capturado",
  "preso",
  "em_julgamento",
  "em_reabilitacao",
  "informante",
  "reformado",
  "aliado_condicional",
  "foragido",
  "desaparecido",
  "morto",
  "desmantelado",
];

export const normalizeVillainLifecycle = (villain) => ({
  ...villain,
  status: villain.status ?? villain.estadoAtual ?? "fugitivo",
  estadoAtual: villain.estadoAtual ?? villain.status ?? "fugitivo",
  threatLevel: villain.threatLevel ?? Math.min(100, (villain.periculosidade ?? 3) * 16),
  notoriety: villain.notoriety ?? Math.min(100, (villain.periculosidade ?? 3) * 12 + (villain.violencia ?? 2) * 6),
  personalNemesisHeroId: villain.personalNemesisHeroId ?? null,
  rivalries: villain.rivalries ?? [],
  captureCount: villain.captureCount ?? 0,
  escapeCount: villain.escapeCount ?? 0,
  reformAttempts: villain.reformAttempts ?? villain.tentativasReforma ?? 0,
  reformProgress: villain.reformProgress ?? (villain.estadoAtual === "reformado" ? 100 : 0),
  reformTrust: villain.reformTrust ?? Math.round((villain.chanceReforma ?? 45) * 0.5),
  reformRisk: villain.reformRisk ?? Math.max(10, 70 - (villain.chanceReforma ?? 45) + (villain.violencia ?? 2) * 8),
  trialStatus: villain.trialStatus ?? "sem_processo",
  prisonSecurityLevel: villain.prisonSecurityLevel ?? 1,
  informantStatus: villain.informantStatus ?? (villain.informante ? "ativo" : "nenhum"),
  lastEncounterDay: villain.lastEncounterDay ?? null,
  activeArcId: villain.activeArcId ?? null,
  grudgeAgainstCentral: villain.grudgeAgainstCentral ?? 20,
  publicImage: villain.publicImage ?? "ameaça urbana",
  associatedFactionId: villain.associatedFactionId ?? villain.factionId ?? null,
  preferredDistrictIds: villain.preferredDistrictIds ?? [],
  eventTags: villain.eventTags ?? [],
});

export const updateVillainAfterMission = (villain, missionResult) => {
  const normalized = normalizeVillainLifecycle(villain);
  const encountered = missionResult.capturedVillain?.id === villain.id || missionResult.event?.factionId === normalized.associatedFactionId;
  if (!encountered) return normalized;
  return {
    ...normalized,
    lastEncounterDay: missionResult.day,
    grudgeAgainstCentral: Math.max(0, Math.min(100, normalized.grudgeAgainstCentral + (missionResult.success ? 8 : -3))),
    threatLevel: Math.max(0, Math.min(100, normalized.threatLevel + (missionResult.success ? -3 : 4))),
  };
};

export const captureVillain = (villainId, gameState) => ({
  ...gameState,
  villains: gameState.villains.map((villain) =>
    villain.id === villainId
      ? {
          ...normalizeVillainLifecycle(villain),
          status: "capturado",
          estadoAtual: "capturado",
          captureCount: (villain.captureCount ?? 0) + 1,
          prisonSecurityLevel: Math.max(1, villain.prisonSecurityLevel ?? 1),
        }
      : villain,
  ),
});

export const sendVillainToTrial = (villainId, gameState) => ({
  ...gameState,
  villains: gameState.villains.map((villain) =>
    villain.id === villainId ? { ...normalizeVillainLifecycle(villain), status: "em_julgamento", estadoAtual: "em_julgamento", trialStatus: "aguardando_audiencia" } : villain,
  ),
});

export const sendVillainToRehabilitation = (villainId, gameState) => ({
  ...gameState,
  villains: gameState.villains.map((villain) =>
    villain.id === villainId ? { ...normalizeVillainLifecycle(villain), status: "em_reabilitacao", estadoAtual: "em reabilitacao", rehabilitationStage: "avaliacao" } : villain,
  ),
});

export const makeVillainInformant = (villainId, gameState) => ({
  ...gameState,
  villains: gameState.villains.map((villain) =>
    villain.id === villainId ? { ...normalizeVillainLifecycle(villain), status: "informante", informante: true, informantStatus: "ativo", estadoAtual: "capturado" } : villain,
  ),
});

export const releaseOrTransferVillain = (villainId, gameState) => ({
  ...gameState,
  villains: gameState.villains.map((villain) =>
    villain.id === villainId ? { ...normalizeVillainLifecycle(villain), status: "preso", estadoAtual: "preso", prisonSecurityLevel: (villain.prisonSecurityLevel ?? 1) + 1 } : villain,
  ),
});

export const attemptVillainEscape = (villainId, gameState) => ({
  ...gameState,
  villains: gameState.villains.map((villain) =>
    villain.id === villainId
      ? {
          ...normalizeVillainLifecycle(villain),
          status: "fugitivo",
          estadoAtual: "fugitivo",
          escapeCount: (villain.escapeCount ?? 0) + 1,
          grudgeAgainstCentral: Math.min(100, (villain.grudgeAgainstCentral ?? 20) + 10),
        }
      : villain,
  ),
});

export const reformVillain = (villainId, assignedHeroId, dispatcher, gameState) => ({
  ...gameState,
  villains: gameState.villains.map((villain) => {
    if (villain.id !== villainId) return villain;
    const normalized = normalizeVillainLifecycle(villain);
    const empathy = dispatcher?.attributes?.empatia ?? 5;
    const progress = Math.min(100, normalized.reformProgress + 10 + empathy);
    return {
      ...normalized,
      assignedMentorHeroId: assignedHeroId,
      reformProgress: progress,
      reformTrust: Math.min(100, normalized.reformTrust + 4),
      status: progress >= 100 ? "reformado" : "em_reabilitacao",
      estadoAtual: progress >= 100 ? "reformado" : "em reabilitacao",
    };
  }),
});

export const convertVillainToAlly = (villainId, gameState) => ({
  ...gameState,
  villains: gameState.villains.map((villain) =>
    villain.id === villainId ? { ...normalizeVillainLifecycle(villain), status: "aliado_condicional", estadoAtual: "reformado", reformProgress: 100 } : villain,
  ),
});
