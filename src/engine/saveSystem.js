const SAVE_KEY = "central-de-crise-herois-de-plantao:v10";
const LEGACY_KEYS = ["central-de-crise-herois-de-plantao:v9", "central-de-crise-herois-de-plantao:v8", "central-de-crise-herois-de-plantao:v7", "central-de-crise-herois-de-plantao:v5", "central-de-crise-herois-de-plantao:v4", "central-de-crise-herois-de-plantao:v2"];

const compactEventForHistory = (event = {}) => ({
  id: event.id,
  titulo: event.titulo,
  bairro: event.bairro,
  districtId: event.districtId,
  faccao: event.faccao,
  factionId: event.factionId,
  vilao: event.vilao,
  villainId: event.villainId,
  villainName: event.villainName,
  nivelRisco: event.nivelRisco,
  dificuldade: event.dificuldade,
  limiteTempoNarrativo: event.limiteTempoNarrativo,
  source: event.source,
  alpha100: event.alpha100,
});

const compactHeroUpdate = (update = {}) => ({
  heroId: update.heroId,
  energyLoss: update.energyLoss,
  stressGain: update.stressGain,
  experienceGain: update.experienceGain,
  injury: update.injury,
  died: update.died,
  nextHero: update.nextHero
    ? {
        id: update.nextHero.id,
        codinome: update.nextHero.codinome,
        nomeCivil: update.nextHero.nomeCivil,
        imageUrl: update.nextHero.imageUrl,
        funcao: update.nextHero.funcao,
        energia: update.nextHero.energia,
        estresse: update.nextHero.estresse,
        moral: update.nextHero.moral,
        status: update.nextHero.status,
      }
    : null,
});

const compactPlayByPlay = (playByPlay) => {
  if (!playByPlay) return null;
  return {
    id: playByPlay.id,
    source: playByPlay.source,
    title: playByPlay.title,
    tone: playByPlay.tone,
    summary: playByPlay.summary,
    beats: (playByPlay.beats ?? []).slice(0, 12).map((beat) => ({
      id: beat.id,
      phase: beat.phase,
      time: beat.time,
      icon: beat.icon,
      text: beat.text,
    })),
    seeds: {
      headlineSeeds: (playByPlay.seeds?.headlineSeeds ?? []).slice(0, 6),
      socialSeeds: (playByPlay.seeds?.socialSeeds ?? []).slice(0, 6),
      legacySeeds: (playByPlay.seeds?.legacySeeds ?? []).slice(0, 6),
    },
    usedVariantIds: (playByPlay.usedVariantIds ?? []).slice(0, 6),
  };
};

const compactMissionForSave = (mission) => {
  if (!mission) return mission;
  return {
    id: mission.id,
    day: mission.day,
    event: compactEventForHistory(mission.event),
    heroIds: mission.heroIds ?? [],
    heroNames: mission.heroNames ?? [],
    chance: mission.chance,
    roll: mission.roll,
    success: mission.success,
    resultType: mission.resultType,
    outcome: mission.outcome,
    narrative: mission.narrative,
    reputationDelta: mission.reputationDelta,
    budgetDelta: mission.budgetDelta,
    civiliansSaved: mission.civiliansSaved,
    materialDamage: mission.materialDamage,
    experienceGain: mission.experienceGain,
    heroUpdates: (mission.heroUpdates ?? []).map(compactHeroUpdate),
    missionFacts: (mission.missionFacts ?? []).map((fact) => ({
      id: fact.id,
      type: fact.type,
      severity: fact.severity,
      involvedHeroIds: fact.involvedHeroIds ?? [],
      affectedDistrictId: fact.affectedDistrictId,
      affectedVillainId: fact.affectedVillainId,
      tags: (fact.tags ?? []).slice(0, 8),
    })),
    relationshipChanges: mission.relationshipChanges ?? [],
    injuries: mission.injuries ?? [],
    deaths: mission.deaths ?? [],
    capturedVillain: mission.capturedVillain,
    dialogue: mission.dialogue
      ? {
          id: mission.dialogue.id,
          tone: mission.dialogue.tone,
          lines: (mission.dialogue.lines ?? []).slice(0, 8),
          effects: mission.dialogue.effects,
        }
      : null,
    playByPlay: compactPlayByPlay(mission.playByPlay),
    activeCombos: (mission.activeCombos ?? []).map((combo) => ({ id: combo.id, name: combo.name })),
    moralAnalysis: mission.moralAnalysis
      ? {
          bonus: mission.moralAnalysis.bonus,
          stress: mission.moralAnalysis.stress,
          tensionRisk: mission.moralAnalysis.tensionRisk,
          heroFits: (mission.moralAnalysis.heroFits ?? []).map((fit) => ({
            heroId: fit.heroId,
            heroName: fit.heroName,
            bonus: fit.bonus,
            stress: fit.stress,
            notes: (fit.notes ?? []).slice(0, 4),
          })),
          pairFriction: (mission.moralAnalysis.pairFriction ?? []).map((friction) => ({
            heroIds: friction.heroIds,
            names: friction.names,
            score: friction.score,
            notes: (friction.notes ?? []).slice(0, 4),
          })),
        }
      : null,
    emotionalConsequences: mission.emotionalConsequences ?? [],
    teamScene: mission.teamScene
      ? {
          id: mission.teamScene.id,
          type: mission.teamScene.type,
          text: mission.teamScene.text,
          effects: mission.teamScene.effects,
        }
      : null,
    districtImpact: mission.districtImpact,
    factionImpact: mission.factionImpact,
    alphaConsequences: mission.alphaConsequences,
    breakdown: mission.breakdown
      ? {
          chance: mission.breakdown.chance,
          capability: mission.breakdown.capability,
          fatiguePenalty: mission.breakdown.fatiguePenalty,
          relationBonus: mission.breakdown.relationBonus,
          roleBonus: mission.breakdown.roleBonus,
          moralBonus: mission.breakdown.moralBonus,
          moralStress: mission.breakdown.moralStress,
          moralTension: mission.breakdown.moralTension,
          injuryRisk: mission.breakdown.injuryRisk,
          deathRisk: mission.breakdown.deathRisk,
        }
      : null,
  };
};

const compactStateForSave = (state) => ({
  ...state,
  dailyLog: (state.dailyLog ?? []).slice(-30).map(compactMissionForSave),
  history: (state.history ?? []).slice(-80).map(compactMissionForSave),
  lastMission: compactMissionForSave(state.lastMission),
  alphaEventLog: (state.alphaEventLog ?? []).slice(0, 300),
  caseRecords: state.caseRecords ?? [],
  intelItems: (state.intelItems ?? []).slice(0, 300),
  interrogationSessions: (state.interrogationSessions ?? []).slice(0, 200),
  progressReports: (state.progressReports ?? []).slice(0, 120),
});

const slimStateForQuotaFallback = (state) => ({
  ...compactStateForSave(state),
  dailyLog: (state.dailyLog ?? []).slice(-10).map(compactMissionForSave),
  history: (state.history ?? []).slice(-30).map(compactMissionForSave),
  lastMission: null,
  recentPlayByPlay: (state.recentPlayByPlay ?? []).slice(0, 30),
});

const buildPayload = (state) =>
  JSON.stringify({
    saveVersion: state.saveVersion ?? "1.2.0",
    savedAt: new Date().toISOString(),
    state: {
      ...state,
      saveVersion: state.saveVersion ?? "1.2.0",
    },
  });

export const saveGame = (state) => {
  if (typeof localStorage === "undefined" || !state) return;

  try {
    localStorage.setItem(SAVE_KEY, buildPayload(compactStateForSave(state)));
  } catch (error) {
    console.warn("Save compactado excedeu o limite do navegador; usando histórico reduzido.", error);
    try {
      localStorage.setItem(SAVE_KEY, buildPayload(slimStateForQuotaFallback(state)));
    } catch (fallbackError) {
      console.warn("Não foi possível salvar o plantão neste navegador.", fallbackError);
    }
  }
};

export const loadGame = () => {
  if (typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(SAVE_KEY) ?? LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (!raw) return null;
    return JSON.parse(raw).state ?? null;
  } catch {
    return null;
  }
};

export const hasSavedGame = () => Boolean(loadGame());

export const clearSavedGame = () => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(SAVE_KEY);
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const resetGame = (createInitialGameState) => {
  clearSavedGame();
  return createInitialGameState();
};
