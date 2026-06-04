import baseScenes from "../data/baseScenes.json";
import { clampRelationship, pairKey } from "./relationships";

const sceneKey = (day, heroCount) => (day * 11 + heroCount * 7) % baseScenes.length;

export const generateBaseScene = (state) => {
  const activeHeroes = state.heroes.filter(
    (hero) => ["active_team", "assigned_by_command", "reformed_villain"].includes(hero.teamStatus) && hero.status !== "morto",
  );
  if (activeHeroes.length < 2) return null;

  const scene = baseScenes[sceneKey(state.day, activeHeroes.length)];
  const first = activeHeroes[(state.day * 3) % activeHeroes.length];
  const second = activeHeroes[(state.day * 5 + 1) % activeHeroes.length];
  if (!first || !second || first.id === second.id) return null;

  return {
    id: `${scene.id}-day-${state.day}`,
    day: state.day,
    location: scene.location,
    tone: scene.tone,
    text: scene.text,
    heroIds: [first.id, second.id],
    heroNames: [first.codinome, second.codinome],
    effects: scene.effects,
  };
};

export const applyBaseScene = (state, scene) => {
  if (!scene) return state;

  const [firstId, secondId] = scene.heroIds;
  const key = pairKey(firstId, secondId);

  return {
    ...state,
    relationships: {
      ...state.relationships,
      [key]: clampRelationship((state.relationships[key] ?? 0) + scene.effects.relationship),
    },
    heroes: state.heroes.map((hero) =>
      scene.heroIds.includes(hero.id)
        ? {
            ...hero,
            estresse: Math.max(0, Math.min(100, hero.estresse + scene.effects.stress)),
            moral: Math.max(0, Math.min(100, (hero.moral ?? 70) + Math.max(-2, scene.effects.relationship))),
          }
        : hero,
    ),
    baseScenes: [scene, ...(state.baseScenes ?? [])].slice(0, 30),
  };
};
