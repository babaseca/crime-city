import teamScenes from "../data/teamScenes.json";
import { clamp } from "./mission";

const eligibleScene = (scene, state) => {
  const morale = state.teamMorale ?? 60;
  if (scene.requiredMoraleAbove && morale < scene.requiredMoraleAbove) return false;
  if (scene.requiredMoraleBelow && morale > scene.requiredMoraleBelow) return false;
  if (scene.requiredStress) {
    const maxStress = Math.max(0, ...(state.heroes ?? []).map((hero) => hero.estresse ?? 0));
    if (maxStress < scene.requiredStress) return false;
  }
  return !(state.recentTeamScenes ?? []).some((entry) => entry.id === scene.id && state.day - entry.day < 5);
};

export const getEligibleScenes = (gameState) => teamScenes.filter((scene) => eligibleScene(scene, gameState));

export const generateMorningBriefingScene = (gameState) => {
  const eligible = getEligibleScenes(gameState);
  if (!eligible.length) return null;
  return eligible[(gameState.day + Math.round(gameState.teamMorale ?? 60)) % eligible.length];
};

export const generateBaseScene = (gameState) => generateMorningBriefingScene(gameState);

export const applySceneChoice = (gameState, choice) => ({
  ...gameState,
  teamMorale: clamp((gameState.teamMorale ?? 60) + (choice.effects?.teamMorale ?? 0), 0, 100),
});

export const applyTeamScene = (gameState, scene) => {
  if (!scene) return gameState;
  const stressDelta = scene.effects?.stress ?? 0;
  return {
    ...gameState,
    teamMorale: clamp((gameState.teamMorale ?? 60) + (scene.effects?.teamMorale ?? 0), 0, 100),
    heroes: (gameState.heroes ?? []).map((hero) =>
      hero.teamStatus === "active_team"
        ? { ...hero, estresse: clamp((hero.estresse ?? 0) + stressDelta, 0, 100), moral: clamp((hero.moral ?? 70) + (scene.effects?.teamMorale ?? 0), 0, 100) }
        : hero,
    ),
    recentTeamScenes: [{ id: scene.id, day: gameState.day }, ...(gameState.recentTeamScenes ?? [])].slice(0, 30),
    baseScenes: [
      {
        id: scene.id,
        day: gameState.day,
        title: scene.type,
        text: scene.text,
        tone: scene.tone,
        effects: scene.effects,
      },
      ...(gameState.baseScenes ?? []),
    ].slice(0, 60),
  };
};
