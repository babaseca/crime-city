import { initializeBaseUpgrades } from "./baseUpgradeSystem";
import { initializeDistricts } from "./districtSystem";
import { initializeEventChains } from "./eventChainSystem";
import { initializeFactions } from "./factionSystem";
import { normalizeHeroFame } from "./heroFameSystem";
import { migrateSaveTo070 } from "./saveMigration070";
import { migrateSaveTo090 } from "./saveMigration090";

export const migrateSaveTo050 = (oldSave) => {
  if (!oldSave) return null;
  const chainState = initializeEventChains();

  return {
    ...oldSave,
    version: "0.5.0-alpha Cidade Viva",
    saveVersion: "0.5.0",
    districts: oldSave.districts?.length ? oldSave.districts : initializeDistricts(),
    factions: oldSave.factions?.length ? oldSave.factions : initializeFactions(),
    activeEventChains: oldSave.activeEventChains ?? chainState.activeEventChains,
    completedEventChains: oldSave.completedEventChains ?? chainState.completedEventChains,
    discoveredClues: oldSave.discoveredClues ?? chainState.discoveredClues,
    socialPosts: oldSave.socialPosts ?? [],
    baseUpgrades: oldSave.baseUpgrades?.length ? oldSave.baseUpgrades : initializeBaseUpgrades(),
    commandObjectives: oldSave.commandObjectives ?? [],
    cityHistory: oldSave.cityHistory ?? [],
    heroes: (oldSave.heroes ?? []).map(normalizeHeroFame),
    newspapers: oldSave.newspapers ?? [],
  };
};

export const migrateSaveToCurrent = (oldSave) => migrateSaveTo090(migrateSaveTo070(migrateSaveTo050(oldSave)));
