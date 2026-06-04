import heroArcs from "../data/heroArcs.json";

export const initializeHeroArcs = () =>
  heroArcs.map((arc) => ({ arcId: arc.id, heroId: arc.heroId, stage: 0, status: "hidden", discoveredDay: null }));

export const getHeroArcStatus = (heroId, arcState = []) =>
  arcState.find((entry) => entry.heroId === heroId) ?? initializeHeroArcs().find((entry) => entry.heroId === heroId) ?? null;

const triggerMet = (hero, trigger = {}) => {
  if (trigger.stressAbove && (hero.estresse ?? 0) < trigger.stressAbove) return false;
  if (trigger.fatigueAbove && (hero.fatigue ?? 0) < trigger.fatigueAbove) return false;
  if (trigger.successfulRescues && (hero.sucessos ?? 0) < trigger.successfulRescues) return false;
  if (trigger.injuriesTaken && (hero.injuries?.length ?? hero.ferimentos?.length ?? 0) < trigger.injuriesTaken) return false;
  return true;
};

export const checkHeroArcTriggers = (gameState) => {
  const current = gameState.heroArcs?.length ? gameState.heroArcs : initializeHeroArcs();
  const nextArcs = current.map((entry) => {
    const arc = heroArcs.find((candidate) => candidate.id === entry.arcId);
    const hero = gameState.heroes?.find((candidate) => candidate.id === entry.heroId);
    if (!arc || !hero || entry.status === "completed") return entry;
    const nextStage = arc.stages.find((stage) => stage.stage === entry.stage + 1);
    if (!nextStage || !triggerMet(hero, nextStage.trigger)) return entry;
    return {
      ...entry,
      stage: nextStage.stage,
      status: nextStage.stage >= arc.stages.length ? "completed" : "active",
      discoveredDay: entry.discoveredDay ?? gameState.day,
      lastSceneId: nextStage.sceneId,
      rewards: nextStage.rewards ?? entry.rewards,
    };
  });
  return { ...gameState, heroArcs: nextArcs };
};

export const advanceHeroArc = (gameState, heroId, arcId) => ({
  ...gameState,
  heroArcs: (gameState.heroArcs ?? initializeHeroArcs()).map((entry) =>
    entry.heroId === heroId && entry.arcId === arcId ? { ...entry, stage: entry.stage + 1, status: "active" } : entry,
  ),
});

export const applyHeroArcReward = (gameState, arcEntry) => {
  const arc = heroArcs.find((candidate) => candidate.id === arcEntry.arcId);
  const reward = arcEntry.rewards?.[0] ?? arc?.stages?.at(-1)?.rewards?.[0];
  if (!reward) return gameState;
  return {
    ...gameState,
    heroes: gameState.heroes.map((hero) =>
      hero.id === arcEntry.heroId ? { ...hero, tracos: [...new Set([...(hero.tracos ?? []), reward])] } : hero,
    ),
  };
};
