export const createHeroVillainRivalry = (heroId, villainId, reason) => ({
  heroId,
  villainId,
  reason,
  intensity: 20,
  history: [{ reason, day: null }],
});

export const updateRivalryAfterEncounter = (hero, villain, result) => {
  const current = (hero.nemeses ?? []).find((entry) => entry.villainId === villain.id);
  const delta = result === "capture" ? 8 : result === "injury" ? 14 : result === "escape" ? 10 : 4;
  const rivalry = current
    ? { ...current, intensity: Math.min(100, current.intensity + delta), history: [{ result }, ...(current.history ?? [])].slice(0, 8) }
    : createHeroVillainRivalry(hero.id, villain.id, result);
  return {
    hero: { ...hero, nemeses: [rivalry, ...(hero.nemeses ?? []).filter((entry) => entry.villainId !== villain.id)].slice(0, 5) },
    villain: {
      ...villain,
      rivalries: [rivalry, ...(villain.rivalries ?? []).filter((entry) => entry.heroId !== hero.id)].slice(0, 5),
      grudgeAgainstHeroes: { ...(villain.grudgeAgainstHeroes ?? {}), [hero.id]: rivalry.intensity },
    },
  };
};

export const getRivalryEffects = (hero, villain, mission) => {
  const rivalry = (hero.nemeses ?? []).find((entry) => entry.villainId === villain?.id);
  if (!rivalry) return { chanceBonus: 0, stressDelta: 0, warning: null };
  const traumatized = (hero.villainTraumas ?? []).includes(villain.id);
  return {
    chanceBonus: traumatized ? -5 : Math.min(8, Math.round(rivalry.intensity / 15)),
    stressDelta: traumatized ? 6 : 2,
    warning: `${hero.codinome} tem rivalidade com ${villain.alcunha ?? villain.name}.`,
  };
};

export const generateRivalryEvent = (gameState) => {
  const hero = (gameState.heroes ?? []).find((candidate) => candidate.nemeses?.length);
  if (!hero) return null;
  const nemesis = hero.nemeses[0];
  return {
    id: `rivalry-${hero.id}-${nemesis.villainId}-${gameState.day}`,
    heroId: hero.id,
    villainId: nemesis.villainId,
    text: `${hero.codinome} reconheceu um padrão ligado a um nêmesis antigo.`,
  };
};
