import seasonArcs from "../data/seasonArcs.json";

export const initializeSeasonArc = () => seasonArcs.map((arc) => ({ ...arc, status: "active", progress: arc.progress ?? 0, events: [] }));

export const checkSeasonProgress = (gameState) => {
  const arcs = (gameState.seasonArcs?.length ? gameState.seasonArcs : initializeSeasonArc()).map((arc) => {
    if (arc.status !== "active") return arc;
    const faction = (gameState.factions ?? []).find((candidate) => candidate.id === arc.mainFactionId);
    const progressGain = Math.max(0, Math.round(((faction?.heat ?? 20) + (faction?.threatLevel ?? 40)) / 30));
    const progress = Math.min(100, (arc.progress ?? 0) + progressGain);
    return {
      ...arc,
      progress,
      status: progress >= 100 ? "finale_ready" : "active",
      events: progressGain ? [{ day: gameState.day, text: `${arc.name} avançou para ${progress}% de tensão.` }, ...(arc.events ?? [])].slice(0, 20) : arc.events ?? [],
    };
  });
  return { ...gameState, seasonArcs: arcs };
};

export const generateSeasonEvent = (gameState) => {
  const arc = (gameState.seasonArcs ?? []).find((candidate) => candidate.status === "finale_ready");
  if (!arc) return null;
  return {
    id: `season-${arc.id}-${gameState.day}`,
    titulo: `Finale: ${arc.name}`,
    descricao: "A campanha acumulou tensão suficiente para uma grande crise da cidade.",
    bairro: "Nova Aurora",
    nivelRisco: 5,
    dificuldade: 86,
    requisitosPrincipais: ["controle", "investigacao", "resistencia"],
    tags: ["temporada", "crise", "facção", "cidade"],
    limiteTempoNarrativo: "toda a madrugada",
    factionId: arc.mainFactionId,
    isSeasonFinale: true,
  };
};

export const resolveSeasonFinale = (gameState, arcId, success) => ({
  ...gameState,
  seasonArcs: (gameState.seasonArcs ?? []).map((arc) =>
    arc.id === arcId ? { ...arc, status: success ? "completed" : "scarred", outcomes: [{ day: gameState.day, success }, ...(arc.outcomes ?? [])] } : arc,
  ),
});
