import { initializeCrisisMissions } from "./crisisMissionSystem";
import { initializeCityLegacy } from "./legacySystem";
import { initializeRivalOrganizations } from "./rivalOrganizationSystem";
import { initializeSeasonArc } from "./seasonArcSystem";
import { normalizeVillainLifecycle } from "./villainLifecycleSystem";
import { migrateSaveTo060 } from "./saveMigration060";

export const migrateSaveTo070 = (oldSave) => {
  const base = migrateSaveTo060(oldSave);
  if (!base) return null;

  return {
    ...base,
    version: "0.7.0-alpha Vilões e Consequências",
    saveVersion: "0.7.0",
    villains: (base.villains ?? []).map(normalizeVillainLifecycle),
    custody: base.custody ?? { capacity: 8, security: 1, dailyCost: 850, publicPressure: 20 },
    reformPrograms: base.reformPrograms ?? [],
    informants: base.informants ?? [],
    rivalries: base.rivalries ?? [],
    retaliationHistory: base.retaliationHistory ?? [],
    rivalOrganizations: base.rivalOrganizations?.length ? base.rivalOrganizations : initializeRivalOrganizations(),
    seasonArcs: base.seasonArcs?.length ? base.seasonArcs : initializeSeasonArc(),
    crisisMissions: base.crisisMissions ?? initializeCrisisMissions(),
    cityLegacy: base.cityLegacy ?? initializeCityLegacy(),
  };
};
