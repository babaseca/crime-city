import teamCombos from "../data/teamCombos.json";
import { relationshipValue } from "./relationships";

const tagsMatch = (combo, event) => {
  const eventTags = `${event.tags?.join(" ") ?? ""} ${event.titulo ?? ""} ${event.descricao ?? ""}`.toLowerCase();
  return combo.requiredTags.some((tag) => eventTags.includes(tag.toLowerCase()));
};

export const getAvailableCombos = (selectedHeroes, mission, relationships, unlockedCombos = []) => {
  const selectedIds = selectedHeroes.map((hero) => hero.id);
  return teamCombos.filter((combo) => {
    const hasHeroes = combo.heroes.every((heroId) => selectedIds.includes(heroId));
    if (!hasHeroes || !tagsMatch(combo, mission)) return false;
    const unlocked = unlockedCombos.includes(combo.id);
    const relationOk = combo.heroes.every((heroA, index) =>
      combo.heroes.slice(index + 1).every((heroB) => relationshipValue(relationships, heroA, heroB) >= combo.requiredRelationship),
    );
    return unlocked || relationOk;
  });
};

export const calculateComboEffects = (combos = []) =>
  combos.reduce(
    (effects, combo) => ({
      successChanceBonus: effects.successChanceBonus + (combo.effects?.successChanceBonus ?? 0),
      injuryRiskReduction: effects.injuryRiskReduction + (combo.effects?.injuryRiskReduction ?? 0),
      collateralReduction: effects.collateralReduction + (combo.effects?.collateralReduction ?? 0),
      reputationBonus: effects.reputationBonus + (combo.effects?.reputationBonus ?? 0),
      stressReduction: effects.stressReduction + (combo.effects?.stressReduction ?? 0),
      clueBonus: effects.clueBonus + (combo.effects?.clueBonus ?? 0),
    }),
    { successChanceBonus: 0, injuryRiskReduction: 0, collateralReduction: 0, reputationBonus: 0, stressReduction: 0, clueBonus: 0 },
  );

export const unlockCombo = (state, comboId, reason = "sinergia em campo") => ({
  ...state,
  unlockedCombos: [...new Set([...(state.unlockedCombos ?? []), comboId])],
  comboHistory: [{ id: comboId, day: state.day, reason }, ...(state.comboHistory ?? [])].slice(0, 30),
});

export const getComboProgress = (heroA, heroB, relationships) => {
  const relation = relationshipValue(relationships, heroA.id, heroB.id);
  return Math.max(0, Math.min(100, Math.round((relation + 100) / 2)));
};
