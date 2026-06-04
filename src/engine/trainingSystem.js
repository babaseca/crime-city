import trainingPrograms from "../data/trainingPrograms.json";
import { baseUpgradeEffect } from "./baseUpgradeSystem";
import { clamp, heroOperationalStatus } from "./mission";

export const initializeTrainingAssignments = () => [];

export const getTrainingProgram = (trainingId) => trainingPrograms.find((program) => program.id === trainingId) ?? trainingPrograms[0];

export const assignTraining = (state, heroId, trainingId) => {
  const program = getTrainingProgram(trainingId);
  if (!program) return { state, message: "Treino não encontrado." };
  if (state.budget < program.cost) return { state, message: "Orçamento insuficiente para esse treino." };
  if ((state.trainingAssignments ?? []).some((assignment) => assignment.heroId === heroId)) {
    return { state, message: "Esse herói já tem uma atividade em andamento." };
  }

  return {
    state: {
      ...state,
      budget: state.budget - program.cost,
      trainingAssignments: [
        ...(state.trainingAssignments ?? []),
        {
          id: `training-${heroId}-${program.id}-${Date.now()}`,
          heroId,
          trainingId,
          startedDay: state.day,
          remainingDays: program.durationDays,
          status: "active",
        },
      ],
      heroes: state.heroes.map((hero) => (hero.id === heroId ? { ...hero, scheduleStatus: program.id === "terapia_operacional" ? "therapy" : "training" } : hero)),
      budgetLog: [
        ...(state.budgetLog ?? []),
        { id: `budget-training-${heroId}-${Date.now()}`, day: state.day, type: "expense", label: `Treinamento: ${program.name}`, amount: program.cost },
      ],
    },
    message: `${program.name} agendado.`,
  };
};

export const calculateTrainingOutcome = (hero, dispatcher, baseUpgrades = []) => {
  const tactical = dispatcher?.attributes?.tatica ?? dispatcher?.attributes?.tática ?? 5;
  const empathy = dispatcher?.attributes?.empatia ?? 5;
  const perkBonus = dispatcher?.perks?.includes("treinador_campo") ? 8 : 0;
  return clamp(55 + tactical * 2 + empathy + baseUpgradeEffect(baseUpgrades, "xpBonus") + perkBonus - (hero.fatigue ?? 0) * 0.15, 20, 96);
};

export const completeTraining = (hero, trainingProgram, dispatcher, baseUpgrades = []) => {
  const outcome = calculateTrainingOutcome(hero, dispatcher, baseUpgrades);
  const strong = outcome >= 72;
  const nextAttributes = { ...hero.atributos };
  Object.entries(trainingProgram.statEffects ?? {}).forEach(([attribute, amount]) => {
    nextAttributes[attribute] = clamp((nextAttributes[attribute] ?? 0) + amount + (strong && amount > 0 ? 1 : 0), 1, 10);
  });
  const next = {
    ...hero,
    atributos: nextAttributes,
    energia: clamp((hero.energia ?? 80) + (trainingProgram.id === "descanso_ativo" ? 16 : -4), 0, 100),
    estresse: clamp((hero.estresse ?? 0) + (trainingProgram.stressEffect ?? 0), 0, 100),
    fatigue: clamp((hero.fatigue ?? 0) + (trainingProgram.fatigueEffect ?? 0), 0, 100),
    experiencia: (hero.experiencia ?? 0) + (strong ? 8 : 4) + baseUpgradeEffect(baseUpgrades, "xpBonus"),
    scheduleStatus: "on_duty",
    tracos:
      strong && trainingProgram.unlocks?.[0]?.startsWith("traço:")
        ? [...new Set([...(hero.tracos ?? []), trainingProgram.unlocks[0].replace("traço:", "").trim()])]
        : hero.tracos,
  };
  next.status = heroOperationalStatus(next);
  return next;
};

export const progressTraining = (state) => {
  const completed = [];
  const nextAssignments = (state.trainingAssignments ?? [])
    .map((assignment) => ({ ...assignment, remainingDays: assignment.remainingDays - 1 }))
    .filter((assignment) => {
      if (assignment.remainingDays <= 0) {
        completed.push(assignment);
        return false;
      }
      return true;
    });

  if (!completed.length) return { ...state, trainingAssignments: nextAssignments };

  const nextHeroes = state.heroes.map((hero) => {
    const assignment = completed.find((entry) => entry.heroId === hero.id);
    if (!assignment) return hero;
    return completeTraining(hero, getTrainingProgram(assignment.trainingId), state.dispatcher, state.baseUpgrades);
  });

  return {
    ...state,
    heroes: nextHeroes,
    trainingAssignments: nextAssignments,
    dailyTrainingLog: [
      ...completed.map((assignment) => ({
        day: state.day,
        heroId: assignment.heroId,
        trainingId: assignment.trainingId,
        programName: getTrainingProgram(assignment.trainingId).name,
      })),
      ...(state.dailyTrainingLog ?? []),
    ].slice(0, 40),
  };
};

export const unlockTraitFromTraining = (hero, trainingProgram) =>
  trainingProgram.unlocks?.[0]?.startsWith("traço:")
    ? { ...hero, tracos: [...new Set([...(hero.tracos ?? []), trainingProgram.unlocks[0].replace("traço:", "").trim()])] }
    : hero;
