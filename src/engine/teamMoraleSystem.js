import { clamp } from "./mission";

export const getMoraleTier = (teamMorale = 60) => {
  if (teamMorale <= 20) return { id: "colapso", label: "Colapso", tone: "danger" };
  if (teamMorale <= 40) return { id: "tensa", label: "Tensa", tone: "warn" };
  if (teamMorale <= 60) return { id: "instavel", label: "Instável", tone: "neutral" };
  if (teamMorale <= 80) return { id: "confiante", label: "Confiante", tone: "good" };
  return { id: "inspirada", label: "Inspirada", tone: "success" };
};

export const calculateTeamMorale = (gameState) => {
  const heroes = (gameState.heroes ?? []).filter((hero) => hero.teamStatus !== "available_global" && hero.status !== "morto");
  if (!heroes.length) return gameState.teamMorale ?? 60;
  const heroMood = heroes.reduce((sum, hero) => sum + (hero.moral ?? 65) - (hero.estresse ?? 0) * 0.15 - (hero.fatigue ?? 0) * 0.12, 0) / heroes.length;
  return clamp(Math.round(heroMood + (gameState.reputation - 50) * 0.12), 0, 100);
};

export const applyDailyMoraleChanges = (gameState, dayReport) => {
  const successes = dayReport.resolved?.length ?? 0;
  const failures = dayReport.failures?.length ?? 0;
  const deaths = dayReport.heroesKilled ?? 0;
  const injuries = dayReport.heroesInjured ?? 0;
  const socialDelta = dayReport.socialDelta ?? 0;
  const delta = successes * 2 - failures * 2 - deaths * 14 - injuries + Math.sign(socialDelta);
  return clamp((gameState.teamMorale ?? calculateTeamMorale(gameState)) + delta, 0, 100);
};

export const generateMoraleEvent = (gameState) => {
  const tier = getMoraleTier(gameState.teamMorale ?? 60);
  if (tier.id === "colapso") return { id: `morale-collapse-${gameState.day}`, tone: "tenso", text: "A equipe evita o olhar uns dos outros. A próxima escala precisa ser humana, não heroica." };
  if (tier.id === "inspirada") return { id: `morale-inspired-${gameState.day}`, tone: "positivo", text: "A sala de comando está cansada, mas viva. Hoje, até o rádio parece torcer junto." };
  return null;
};

export const applyMoraleEffectsToMission = (missionChance, teamMorale = 60) => {
  const tier = getMoraleTier(teamMorale);
  const bonus = tier.id === "inspirada" ? 5 : tier.id === "confiante" ? 2 : tier.id === "tensa" ? -3 : tier.id === "colapso" ? -7 : 0;
  return clamp(missionChance + bonus, 3, 98);
};
