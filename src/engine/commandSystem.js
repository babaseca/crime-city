import commandEvents from "../data/commandEvents.json";
import { getMostDangerousDistricts } from "./districtSystem";
import { calculateFactionRetaliationRisk } from "./factionSystem";

const activeTeamCount = (heroes) =>
  heroes.filter((hero) => ["active_team", "assigned_by_command", "reformed_villain"].includes(hero.teamStatus) && hero.status !== "morto").length;

const findGlobalHero = (heroes) => heroes.find((hero) => hero.teamStatus === "available_global" && hero.status !== "morto");

export const generateCommandEvent = (state, report) => {
  const activeCount = activeTeamCount(state.heroes);
  const day = state.day;
  const criticalDistrict = getMostDangerousDistricts(state.districts ?? [], 1)[0];
  const hotFaction = [...(state.factions ?? [])].sort((first, second) => calculateFactionRetaliationRisk(second) - calculateFactionRetaliationRisk(first))[0];

  if (criticalDistrict && day > 1 && (criticalDistrict.trustInCentral < 34 || criticalDistrict.dangerLevel > 72)) {
    return {
      id: `command-district-${criticalDistrict.id}-${day}`,
      type: "district_objective",
      tone: "prioridade urbana",
      day,
      districtId: criticalDistrict.id,
      districtName: criticalDistrict.name,
      message: `O Comando quer presença reforçada em ${criticalDistrict.name}. A confiança local está baixa demais para ignorar.`,
      objective: {
        id: `obj-district-${criticalDistrict.id}-${day}`,
        type: "district_support",
        districtId: criticalDistrict.id,
        label: `Resolver ocorrência em ${criticalDistrict.name}`,
        deadlineDay: day + 2,
        reward: { budget: 6000, reputation: 2 },
        penalty: { reputation: -3 },
        status: "active",
      },
    };
  }

  if (hotFaction && day > 2 && calculateFactionRetaliationRisk(hotFaction) > 62) {
    return {
      id: `command-faction-${hotFaction.id}-${day}`,
      type: "faction_objective",
      tone: "pressão tática",
      day,
      factionId: hotFaction.id,
      factionName: hotFaction.name,
      message: `${hotFaction.name} está ganhando espaço demais. O Comando quer reduzir influência nos próximos dias.`,
      objective: {
        id: `obj-faction-${hotFaction.id}-${day}`,
        type: "faction_pressure",
        factionId: hotFaction.id,
        label: `Pressionar ${hotFaction.name}`,
        deadlineDay: day + 3,
        reward: { budget: 7500, reputation: 2 },
        penalty: { reputation: -4 },
        status: "active",
      },
    };
  }

  if (activeCount < 3) {
    const hero = findGlobalHero(state.heroes);
    if (hero) {
      return {
        ...commandEvents.find((event) => event.id === "reinforcement_low_roster"),
        day,
        heroId: hero.id,
        heroName: hero.codinome,
        daysRemaining: 3,
      };
    }
  }

  if (report?.resolved.length >= 2 && report.failures.length === 0 && state.reputation >= 65) {
    return { ...commandEvents.find((event) => event.id === "budget_reward"), day, amount: 8500 };
  }

  if (report?.failures.length >= report?.resolved.length && state.reputation < 45) {
    return { ...commandEvents.find((event) => event.id === "budget_cut"), day, amount: 6500 };
  }

  if (day % 3 === 0) return { ...commandEvents.find((event) => event.id === "district_priority_rubi"), day };
  if (state.reputation < 38) return { ...commandEvents.find((event) => event.id === "public_warning"), day };

  return null;
};

export const applyCommandEvent = (state, event) => {
  if (!event) return state;
  const commandObjectives = event.objective
    ? [event.objective, ...(state.commandObjectives ?? []).filter((objective) => objective.status === "active")].slice(0, 6)
    : state.commandObjectives ?? [];

  if (event.type === "reinforcement") {
    return {
      ...state,
      heroes: state.heroes.map((hero) =>
        hero.id === event.heroId
          ? { ...hero, teamStatus: "assigned_by_command", commandDaysRemaining: event.daysRemaining, status: "disponivel" }
          : hero,
      ),
      commandObjectives,
      commandEvents: [event, ...(state.commandEvents ?? [])].slice(0, 20),
    };
  }

  if (event.type === "budget_bonus") {
    return {
      ...state,
      budget: state.budget + event.amount,
      budgetLog: [
        ...state.budgetLog,
        { id: `budget-command-${event.id}-${Date.now()}`, day: event.day, type: "income", label: "Verba extra do Comando", amount: event.amount },
      ],
      commandObjectives,
      commandEvents: [event, ...(state.commandEvents ?? [])].slice(0, 20),
    };
  }

  if (event.type === "budget_cut") {
    return {
      ...state,
      budget: Math.max(0, state.budget - event.amount),
      budgetLog: [
        ...state.budgetLog,
        { id: `budget-command-${event.id}-${Date.now()}`, day: event.day, type: "expense", label: "Corte de verba do Comando", amount: event.amount },
      ],
      commandObjectives,
      commandEvents: [event, ...(state.commandEvents ?? [])].slice(0, 20),
    };
  }

  return {
    ...state,
    commandObjectives,
    commandEvents: [event, ...(state.commandEvents ?? [])].slice(0, 20),
    cityPriority: event.district ? { district: event.district, day: event.day } : state.cityPriority,
  };
};

export const tickCommandAssignments = (heroes) =>
  heroes.map((hero) => {
    if (hero.teamStatus !== "assigned_by_command") return hero;
    const remaining = (hero.commandDaysRemaining ?? 1) - 1;
    if (remaining <= 0) {
      return { ...hero, teamStatus: "available_global", commandDaysRemaining: 0 };
    }

    return { ...hero, commandDaysRemaining: remaining };
  });
