import teamScenes from "../data/teamScenes.json";
import alpha11TeamScenes from "../data/alpha11TeamScenes";
import { normalizeDisplayText } from "../utils/formatters";
import { clamp } from "./mission";
import { adjustRelationshipProfile, pairKey, relationshipProfile } from "./relationships";

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

const normalizeSceneText = (scene) =>
  scene
    ? {
        ...scene,
        text: normalizeDisplayText(scene.text),
        type: scene.type ? normalizeDisplayText(scene.type) : scene.type,
        tone: scene.tone ? normalizeDisplayText(scene.tone) : scene.tone,
      }
    : null;

export const generateMorningBriefingScene = (gameState) => {
  const eligible = getEligibleScenes(gameState);
  if (!eligible.length) return null;
  return normalizeSceneText(eligible[(gameState.day + Math.round(gameState.teamMorale ?? 60)) % eligible.length]);
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

const stableHash = (value = "") => {
  let hash = 0;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const missionHasRequiredHeroes = (scene, mission) => {
  const required = scene.requiredHeroIds ?? [];
  if (!required.length) return true;
  const heroIds = new Set(mission?.heroIds ?? []);
  return required.every((heroId) => heroIds.has(heroId));
};

const missionHasRequiredFacts = (scene, mission) => {
  const required = scene.requiredFacts ?? [];
  if (!required.length) return true;
  const factTypes = new Set((mission?.missionFacts ?? []).map((fact) => fact.type));
  return required.every((factType) => factTypes.has(factType));
};

const relationshipRequirementMatches = (scene, state) => {
  const requirement = scene.requiredRelationship;
  const heroes = scene.requiredHeroIds ?? [];
  if (!requirement || heroes.length < 2) return true;

  for (let i = 0; i < heroes.length; i += 1) {
    for (let j = i + 1; j < heroes.length; j += 1) {
      const profile = relationshipProfile(state.relationships, heroes[i], heroes[j]);
      if (requirement.trustMin && (profile.trust ?? 0) < requirement.trustMin) return false;
      if (requirement.respectMin && (profile.respect ?? 0) < requirement.respectMin) return false;
      if (requirement.closenessMin && (profile.closeness ?? 0) < requirement.closenessMin) return false;
      if (requirement.tensionMin && (profile.tension ?? 0) < requirement.tensionMin) return false;
      if (requirement.tensionMax && (profile.tension ?? 0) > requirement.tensionMax) return false;
    }
  }

  return true;
};

const eligiblePostMissionScene = (scene, state, mission) =>
  missionHasRequiredHeroes(scene, mission) &&
  missionHasRequiredFacts(scene, mission) &&
  relationshipRequirementMatches(scene, state) &&
  !(state.recentTeamScenes ?? []).some((entry) => entry.id === scene.id && state.day - entry.day < 4);

export const generatePostMissionTeamScene = (state, mission) => {
  const eligible = alpha11TeamScenes.filter((scene) => eligiblePostMissionScene(scene, state, mission));
  if (!eligible.length) return null;
  const index = stableHash(`${mission.id}:${mission.heroIds?.join("-")}:${mission.missionFacts?.map((fact) => fact.type).join("-")}`) % eligible.length;
  return normalizeSceneText(eligible[index]);
};

export const applyPostMissionTeamScene = (gameState, scene, mission) => {
  if (!scene) return gameState;

  const stressDelta = scene.effects?.stress ?? 0;
  const relationshipDelta = scene.effects?.relationshipDelta ?? null;
  const relationships = { ...(gameState.relationships ?? {}) };

  if (relationshipDelta && (scene.requiredHeroIds ?? []).length >= 2) {
    for (let i = 0; i < scene.requiredHeroIds.length; i += 1) {
      for (let j = 0; j < scene.requiredHeroIds.length; j += 1) {
        if (i === j) continue;
        const key = pairKey(scene.requiredHeroIds[i], scene.requiredHeroIds[j]);
        relationships[key] = adjustRelationshipProfile(relationships[key], 0, relationshipDelta);
      }
    }
  }

  return {
    ...gameState,
    relationships,
    teamMorale: clamp((gameState.teamMorale ?? 60) + (scene.effects?.teamMorale ?? 0), 0, 100),
    heroes: (gameState.heroes ?? []).map((hero) =>
      mission.heroIds?.includes(hero.id)
        ? { ...hero, estresse: clamp((hero.estresse ?? 0) + stressDelta, 0, 100), moral: clamp((hero.moral ?? 70) + (scene.effects?.teamMorale ?? 0), 0, 100) }
        : hero,
    ),
    recentTeamScenes: [{ id: scene.id, day: gameState.day, sourceMissionId: mission.id }, ...(gameState.recentTeamScenes ?? [])].slice(0, 30),
    baseScenes: [
      {
        id: scene.id,
        day: gameState.day,
        title: scene.type,
        text: scene.text,
        tone: scene.type,
        effects: scene.effects,
        sourceMissionId: mission.id,
        sourceFactIds: mission.missionFacts?.filter((fact) => scene.requiredFacts?.includes(fact.type)).map((fact) => fact.id) ?? [],
      },
      ...(gameState.baseScenes ?? []),
    ].slice(0, 60),
  };
};
