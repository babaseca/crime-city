import { initializeHeroArcs } from "./heroArcSystem";
import { normalizeHeroInjuries } from "./injurySystem";
import { normalizeHeroSchedule, initializeSchedule } from "./scheduleSystem";
import { calculateTeamMorale } from "./teamMoraleSystem";
import { initializeTrainingAssignments } from "./trainingSystem";
import { normalizeDispatcherProgression } from "./dispatcherProgressionSystem";

export const migrateSaveTo060 = (oldSave) => {
  if (!oldSave) return null;
  const heroes = (oldSave.heroes ?? []).map((hero) => normalizeHeroSchedule(normalizeHeroInjuries(hero)));
  const stateForMorale = { ...oldSave, heroes };

  return {
    ...oldSave,
    version: "0.6.0-alpha Equipe Viva",
    saveVersion: "0.6.0",
    heroes,
    dispatcher: normalizeDispatcherProgression(oldSave.dispatcher),
    schedule: oldSave.schedule?.length ? oldSave.schedule : initializeSchedule(heroes),
    teamMorale: oldSave.teamMorale ?? calculateTeamMorale(stateForMorale),
    trainingAssignments: oldSave.trainingAssignments ?? initializeTrainingAssignments(),
    unlockedCombos: oldSave.unlockedCombos ?? [],
    comboHistory: oldSave.comboHistory ?? [],
    heroArcs: oldSave.heroArcs?.length ? oldSave.heroArcs : initializeHeroArcs(),
    recentTeamScenes: oldSave.recentTeamScenes ?? [],
    dailyTrainingLog: oldSave.dailyTrainingLog ?? [],
    uiSettings: {
      density: oldSave.uiSettings?.density ?? "comfortable",
    },
  };
};
