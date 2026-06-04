import retaliationEvents from "../data/retaliationEvents.json";

export const calculateRetaliationPool = (gameState) => {
  const hotFactions = (gameState.factions ?? []).filter((faction) => faction.heat >= faction.retaliationThreshold || faction.status === "em retaliação");
  const angryVillains = (gameState.villains ?? []).filter((villain) => (villain.grudgeAgainstCentral ?? 0) >= 70 && ["fugitivo", "foragido"].includes(villain.status ?? villain.estadoAtual));
  return { hotFactions, angryVillains };
};

export const generateRetaliationEvent = (gameState) => {
  const pool = calculateRetaliationPool(gameState);
  if (!pool.hotFactions.length && !pool.angryVillains.length) return null;
  if ((gameState.day + pool.hotFactions.length + pool.angryVillains.length) % 4 !== 0) return null;
  const template = retaliationEvents[(gameState.day + pool.hotFactions.length) % retaliationEvents.length];
  const district = (gameState.districts ?? [])[gameState.day % Math.max(1, (gameState.districts ?? []).length)];
  const faction = pool.hotFactions[0];
  return {
    id: `${template.id}-${gameState.day}`,
    titulo: template.title,
    title: template.title,
    descricao: template.description,
    description: template.description,
    bairro: district?.name ?? "Nova Aurora",
    districtId: district?.id,
    factionId: faction?.id,
    nivelRisco: template.risk,
    risk: template.risk,
    dificuldade: template.difficulty,
    difficulty: template.difficulty,
    requisitosPrincipais: ["investigacao", "controle", "carisma"],
    tags: template.tags,
    limiteTempoNarrativo: "até o fim do turno",
    isFactionEvent: true,
    isRetaliation: true,
  };
};

export const applyRetaliationResult = (gameState, retaliationResult) => ({
  ...gameState,
  retaliationHistory: [{ day: gameState.day, result: retaliationResult }, ...(gameState.retaliationHistory ?? [])].slice(0, 40),
});
