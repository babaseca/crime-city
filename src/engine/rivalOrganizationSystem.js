import rivalOrganizations from "../data/rivalOrganizations.json";

export const initializeRivalOrganizations = () => rivalOrganizations.map((org) => ({ ...org, events: [] }));

export const applyDailyRivalOrganizationTick = (gameState) => {
  const orgs = (gameState.rivalOrganizations?.length ? gameState.rivalOrganizations : initializeRivalOrganizations()).map((org) => {
    const reputationPressure = gameState.reputation < 45 ? 2 : gameState.reputation > 75 ? -1 : 0;
    const rivalryLevel = Math.max(0, Math.min(100, org.rivalryLevel + reputationPressure));
    const event =
      (gameState.day + org.id.length) % 6 === 0
        ? {
            day: gameState.day,
            text:
              rivalryLevel > 55
                ? `${org.name} apareceu em coletiva sugerindo que faria melhor.`
                : `${org.name} ofereceu apoio técnico em uma crise futura.`,
          }
        : null;
    return { ...org, rivalryLevel, events: event ? [event, ...(org.events ?? [])].slice(0, 12) : org.events ?? [] };
  });
  return { ...gameState, rivalOrganizations: orgs };
};
