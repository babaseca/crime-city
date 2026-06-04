import dispatcherPerks from "../data/dispatcherPerks.json";

export const normalizeDispatcherProgression = (dispatcher) => ({
  ...dispatcher,
  level: dispatcher?.level ?? 1,
  xp: dispatcher?.xp ?? 0,
  nextLevelXp: dispatcher?.nextLevelXp ?? 100,
  perks: dispatcher?.perks ?? dispatcher?.upgrades ?? [],
  internalTrust: dispatcher?.internalTrust ?? 55,
  heroRelations: dispatcher?.heroRelations ?? {},
  leadershipXp: dispatcher?.leadershipXp ?? 0,
});

export const dispatcherPerkList = dispatcherPerks;

export const dispatcherHasPerk = (dispatcher, perkId) => (dispatcher?.perks ?? dispatcher?.upgrades ?? []).includes(perkId);

export const grantDispatcherLeadershipXp = (dispatcher, amount) => {
  let next = normalizeDispatcherProgression(dispatcher);
  next.xp += amount;
  next.leadershipXp += amount;
  while (next.xp >= next.nextLevelXp) {
    next.xp -= next.nextLevelXp;
    next.level += 1;
    next.pendingUpgrades = (next.pendingUpgrades ?? 0) + 1;
    next.nextLevelXp = Math.round(next.nextLevelXp * 1.25);
  }
  return next;
};

export const applyDispatcherPerk = (dispatcher, perkId) => {
  const perk = dispatcherPerks.find((candidate) => candidate.id === perkId);
  if (!perk) return dispatcher;
  const next = normalizeDispatcherProgression(dispatcher);
  if (next.perks.includes(perkId)) return next;
  return {
    ...next,
    perks: [...next.perks, perkId],
    upgrades: [...new Set([...(next.upgrades ?? []), perkId])],
    pendingUpgrades: Math.max(0, (next.pendingUpgrades ?? 0) - 1),
  };
};
