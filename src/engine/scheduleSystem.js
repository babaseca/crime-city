import { heroOperationalStatus } from "./mission";

export const scheduleStatuses = {
  on_duty: "Plantão",
  resting: "Descanso",
  training: "Treinamento",
  therapy: "Terapia",
  medical: "Tratamento",
  reserve: "Reserva",
  unavailable: "Indisponível",
};

const activeTeamStatuses = ["active_team", "assigned_by_command", "reformed_villain"];

export const normalizeHeroSchedule = (hero) => ({
  ...hero,
  scheduleStatus:
    hero.scheduleStatus ??
    (hero.teamStatus === "reserve" || hero.teamStatus === "available_global"
      ? "reserve"
      : hero.status === "ferido"
        ? "medical"
        : "on_duty"),
  fatigue: hero.fatigue ?? Math.max(0, Math.round((100 - (hero.energia ?? 90)) * 0.35 + (hero.estresse ?? 0) * 0.25)),
  burnoutRisk: hero.burnoutRisk ?? 0,
  restDays: hero.restDays ?? 0,
  lastMissionDay: hero.lastMissionDay ?? null,
  overworkedCount: hero.overworkedCount ?? 0,
});

export const initializeSchedule = (heroes = []) =>
  heroes.map((hero) => ({
    heroId: hero.id,
    status: normalizeHeroSchedule(hero).scheduleStatus,
    note: "",
  }));

export const setHeroSchedule = (state, heroId, scheduleStatus) => ({
  ...state,
  heroes: state.heroes.map((hero) => {
    if (hero.id !== heroId) return hero;
    const next = {
      ...normalizeHeroSchedule(hero),
      scheduleStatus,
      status: scheduleStatus === "medical" && hero.status !== "morto" ? "ferido" : heroOperationalStatus(hero),
    };
    if (scheduleStatus === "reserve") next.teamStatus = hero.teamStatus === "reserve" ? "reserve" : hero.teamStatus;
    return next;
  }),
  schedule: (state.schedule ?? []).map((entry) => (entry.heroId === heroId ? { ...entry, status: scheduleStatus } : entry)),
});

export const getAvailableHeroesForDispatch = (state) =>
  (state.heroes ?? [])
    .map(normalizeHeroSchedule)
    .filter(
      (hero) =>
        activeTeamStatuses.includes(hero.teamStatus) &&
        hero.scheduleStatus === "on_duty" &&
        !["morto", "ferido", "exausto"].includes(hero.status),
    );

export const calculateOffDutyPenalty = (hero, mission) => {
  if (hero.scheduleStatus === "on_duty") return 0;
  const risk = mission?.nivelRisco ?? mission?.risk ?? 2;
  if (hero.scheduleStatus === "resting") return 8 + risk * 2;
  if (hero.scheduleStatus === "training") return 10 + risk * 2;
  if (hero.scheduleStatus === "therapy") return 14 + risk * 2;
  if (hero.scheduleStatus === "medical") return 25 + risk * 4;
  return 18;
};

export const applyScheduleEndOfDayRecovery = (state) => ({
  ...state,
  heroes: (state.heroes ?? []).map((hero) => {
    const current = normalizeHeroSchedule(hero);
    if (current.status === "morto") return current;
    if (current.scheduleStatus === "resting") {
      return {
        ...current,
        energia: Math.min(100, (current.energia ?? 0) + 18),
        estresse: Math.max(0, (current.estresse ?? 0) - 6),
        fatigue: Math.max(0, (current.fatigue ?? 0) - 14),
        restDays: (current.restDays ?? 0) + 1,
        overworkedCount: Math.max(0, (current.overworkedCount ?? 0) - 1),
        status: heroOperationalStatus({ ...current, energia: Math.min(100, (current.energia ?? 0) + 18), estresse: Math.max(0, (current.estresse ?? 0) - 6) }),
      };
    }
    if (current.scheduleStatus === "therapy") {
      return {
        ...current,
        estresse: Math.max(0, (current.estresse ?? 0) - 14),
        fatigue: Math.max(0, (current.fatigue ?? 0) - 4),
        status: heroOperationalStatus({ ...current, estresse: Math.max(0, (current.estresse ?? 0) - 14) }),
      };
    }
    return {
      ...current,
      fatigue: Math.min(100, (current.fatigue ?? 0) + (current.scheduleStatus === "on_duty" ? 3 : 0)),
    };
  }),
});

export const forceCallHero = (state, heroId, missionId) => ({
  ...state,
  heroes: state.heroes.map((hero) =>
    hero.id === heroId
      ? {
          ...normalizeHeroSchedule(hero),
          scheduleStatus: "on_duty",
          estresse: Math.min(100, (hero.estresse ?? 0) + 8),
          fatigue: Math.min(100, (hero.fatigue ?? 0) + 10),
          overworkedCount: (hero.overworkedCount ?? 0) + 1,
          forcedCallLog: [{ day: state.day, missionId }, ...(hero.forcedCallLog ?? [])].slice(0, 6),
        }
      : hero,
  ),
});
