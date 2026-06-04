import { heroes as heroData } from "../data/heroes";
import { events } from "../data/events";
import applicantData from "../data/applicants.json";
import villainData from "../data/villains.json";
import { applyBaseScene, generateBaseScene } from "./baseSceneSystem";
import { baseUpgradeEffect, initializeBaseUpgrades } from "./baseUpgradeSystem";
import { applyCommandEvent, generateCommandEvent, tickCommandAssignments } from "./commandSystem";
import { generateCrisisEvent, initializeCrisisMissions } from "./crisisMissionSystem";
import { applyCustodyDailyTick } from "./custodySystem";
import { createDispatcher, grantDispatcherDayXp } from "./dispatcherSystem";
import { normalizeDispatcherProgression } from "./dispatcherProgressionSystem";
import {
  applyDailyDistrictDecay,
  applyMissionResultToDistricts,
  districtIdFromName,
  getDistrictById,
  getDistrictModifiersForEvent,
  getMostDangerousDistricts,
  initializeDistricts,
  markDistrictAlertsGenerated,
} from "./districtSystem";
import { advanceEventChainsAfterMission, generateChainEvents, initializeEventChains } from "./eventChainSystem";
import { applyDailyFactionTick, applyMissionResultToFactions, factionIdFromName, getFactionById, initializeFactions } from "./factionSystem";
import { applyMissionFatigue } from "./fatigueSystem";
import { applyMissionResultToHeroesFame, normalizeHeroFame } from "./heroFameSystem";
import { checkHeroArcTriggers, initializeHeroArcs } from "./heroArcSystem";
import { normalizeHeroInjuries, progressInjuryRecovery } from "./injurySystem";
import { initializeCityLegacy, recordLegacyFromMission } from "./legacySystem";
import { buildInitialRelationships } from "./relationships";
import { generateRetaliationEvent } from "./retaliationSystem";
import { applyDailyRivalOrganizationTick, initializeRivalOrganizations } from "./rivalOrganizationSystem";
import { normalizeHeroSchedule, initializeSchedule, applyScheduleEndOfDayRecovery } from "./scheduleSystem";
import { checkSeasonProgress, generateSeasonEvent, initializeSeasonArc } from "./seasonArcSystem";
import { heroOperationalStatus, resolveMission } from "./mission";
import { generateNewspaper } from "./newspaperSystem";
import { normalizeApplicant } from "./recruitmentSystem";
import { migrateSaveToCurrent } from "./saveMigrationSystem";
import { initialPlayByPlayStats } from "./saveMigration090";
import { applySocialImpactToReputation, generateSocialPosts } from "./socialSystem";
import { applyTeamScene, generateBaseScene as generateTeamScene } from "./teamSceneSystem";
import { applyDailyMoraleChanges, calculateTeamMorale } from "./teamMoraleSystem";
import { progressTraining } from "./trainingSystem";
import { captureVillain, normalizeVillain } from "./villainSystem";
import { normalizeVillainLifecycle, updateVillainAfterMission } from "./villainLifecycleSystem";
import { checkRehabilitationEvent, progressRehabilitation } from "./villainReformSystem";
import { buildMissionNarrativeContext } from "./playByPlayContext";
import { generateMissionPlayByPlay, rememberUsedPlayByPlay } from "./playByPlaySystem";

export const SAVE_VERSION = "0.9.5";
export const ACTIVE_TEAM_LIMIT = 8;

const defaultInitialHeroIds = ["h-aurora-vetor", "h-bruma-livre", "h-domo-prata"];
export const initialTeamCandidateIds = [
  "h-aurora-vetor",
  "h-bruma-livre",
  "h-cifra-rasa",
  "h-domo-prata",
  "h-eco-mandarim",
  "h-geodo-vivo",
];

const activeTeamStatuses = ["active_team", "assigned_by_command", "reformed_villain"];

export const isMissionAvailableHero = (hero) =>
  activeTeamStatuses.includes(hero.teamStatus) &&
  (hero.scheduleStatus ?? "on_duty") === "on_duty" &&
  !["morto", "ferido", "exausto"].includes(hero.status);

export const activeTeamCount = (heroes) => heroes.filter((hero) => activeTeamStatuses.includes(hero.teamStatus) && hero.status !== "morto").length;

const cloneHero = (hero, index = 0, initialHeroIds = defaultInitialHeroIds) => {
  const teamStatus =
    hero.teamStatus ??
    (initialHeroIds.includes(hero.id)
      ? "active_team"
      : hero.rosterStatus === "reserva"
        ? "reserve"
        : hero.rosterStatus === "morto" || hero.status === "morto"
          ? "dead"
          : "available_global");

  return normalizeHeroSchedule(normalizeHeroInjuries(normalizeHeroFame({
    ...hero,
    atributos: { ...hero.atributos },
    tracos: [...hero.tracos],
    bio:
      hero.bio ??
      `${hero.codinome} integra o banco global de Nova Aurora e pode cruzar o plantão do Dispatcher quando a campanha chamar.`,
    moral: hero.moral ?? 72,
    teamStatus,
    rosterStatus: teamStatus,
    status: hero.status === "morto" ? "morto" : heroOperationalStatus({ ...hero, teamStatus }),
    energia: hero.energia ?? 92,
    estresse: hero.estresse ?? 8,
    ferimentos: hero.ferimentos ?? [],
    traumas: hero.traumas ?? [],
    missoes: hero.missoes ?? 0,
    sucessos: hero.sucessos ?? 0,
    falhas: hero.falhas ?? 0,
    civisSalvos: hero.civisSalvos ?? 0,
    arcosPessoais: hero.arcosPessoais ?? (index % 5 === 0 ? ["Pressão pública"] : ["Plantão em aberto"]),
    falasMarcantes: hero.falasMarcantes ?? [],
    scheduleStatus: hero.scheduleStatus ?? (teamStatus === "reserve" || teamStatus === "available_global" ? "reserve" : "on_duty"),
    fatigue: hero.fatigue ?? 0,
    burnoutRisk: hero.burnoutRisk ?? 0,
    restDays: hero.restDays ?? 0,
    overworkedCount: hero.overworkedCount ?? 0,
    injuries: hero.injuries ?? hero.ferimentos ?? [],
    medicalStatus: hero.medicalStatus ?? "liberado",
    nemeses: hero.nemeses ?? [],
    villainTraumas: hero.villainTraumas ?? [],
  })));
};

const seededIndex = (day, index, max) => (day * 37 + index * 19 + day * index * 7) % Math.max(1, max);

const difficultyModifierFor = (district, event) =>
  getDistrictModifiersForEvent(district, event).reduce((sum, modifier) => sum + (modifier.effect?.difficultyModifier ?? 0), 0);

const publicModifierFor = (district, event, success) =>
  getDistrictModifiersForEvent(district, event).reduce(
    (sum, modifier) => sum + (success ? modifier.effect?.reputationSuccessModifier ?? 0 : modifier.effect?.reputationFailureModifier ?? 0),
    0,
  );

const annotateEvent = (event, districts, factions, preferredDistrict = null) => {
  const district = preferredDistrict ?? getDistrictById(districts, event.districtId) ?? getDistrictById(districts, districtIdFromName(event.bairro));
  if (!district) return event;
  const factionId = event.factionId ?? (district.dangerLevel >= 45 ? district.dominantFactionId : null);
  const faction = getFactionById(factions, factionId);
  const difficultyModifier = difficultyModifierFor(district, event) + (faction ? Math.round(faction.threatLevel / 30) : 0);
  const factionTags = faction?.tags?.slice(0, 2) ?? [];

  return {
    ...event,
    bairro: district.name,
    districtId: district.id,
    factionId,
    isFactionEvent: Boolean(event.isFactionEvent || faction),
    dificuldade: Math.max(24, Math.min(96, event.dificuldade + difficultyModifier)),
    nivelRisco: Math.max(1, Math.min(5, event.nivelRisco + (district.dangerLevel >= 74 ? 1 : 0))),
    tags: [...new Set([...(event.tags ?? []), ...district.tags.slice(0, 2), ...factionTags])],
    cityModifiers: {
      difficultyModifier,
      reputationSuccessModifier: publicModifierFor(district, event, true),
      reputationFailureModifier: publicModifierFor(district, event, false),
    },
  };
};

export const generateDailyAlerts = (paramsOrDay, activeSizeArg, cityStateArg = {}) => {
  const params =
    typeof paramsOrDay === "object"
      ? paramsOrDay
      : { day: paramsOrDay, activeTeamSize: activeSizeArg, ...(cityStateArg ?? {}) };
  const day = params.day ?? 1;
  const activeSize = params.activeTeamSize ?? params.activeSize ?? 2;
  const districts = params.districts?.length ? params.districts : initializeDistricts();
  const factions = params.factions?.length ? params.factions : initializeFactions();
  const resolvedIds = params.resolvedIds ?? [];
  const commandObjectives = params.commandObjectives ?? [];
  const maxCount = day === 1 ? 3 : day === 2 ? 3 : Math.min(6, Math.max(3, activeSize + Math.floor(day / 3)));
  const targetCount = Math.max(day === 1 ? 2 : 3, Math.min(maxCount, activeSize + 1));
  const maxRisk = day === 1 ? 3 : day === 2 ? 4 : 5;
  const maxDifficulty = day === 1 ? 68 : day === 2 ? 78 : 98;
  const chainEvents = generateChainEvents(params.activeChains ?? [], districts, day);
  const specialEvents = [...(params.factionEvents ?? []), ...chainEvents].slice(0, day <= 2 ? 1 : 2);
  const dangerousDistricts = getMostDangerousDistricts(districts, 6);
  const objectiveDistrictId = commandObjectives.find((objective) => objective.status === "active" && objective.districtId)?.districtId;
  const selected = [...specialEvents];
  const used = new Set(selected.map((event) => event.id));
  const commonPool = events.filter((event) => !resolvedIds.includes(event.id) && event.nivelRisco <= maxRisk && event.dificuldade <= maxDifficulty);
  const fallback = events.filter((event) => !resolvedIds.includes(event.id));
  const pool = commonPool.length >= targetCount ? commonPool : fallback;

  for (let index = 0; selected.length < targetCount && used.size < pool.length + specialEvents.length; index += 1) {
    const district =
      (objectiveDistrictId && getDistrictById(districts, objectiveDistrictId)) ??
      dangerousDistricts[(index + day) % Math.max(1, dangerousDistricts.length)] ??
      districts[seededIndex(day, index, districts.length)];
    const districtMatches = pool.filter((event) => districtIdFromName(event.bairro) === district.id);
    const source = districtMatches.length ? districtMatches : pool;
    const event = source[seededIndex(day, index + activeSize + district.dangerLevel, source.length)];

    if (event && !used.has(event.id)) {
      selected.push(annotateEvent(event, districts, factions, district));
      used.add(event.id);
    }
  }

  return selected.slice(0, targetCount).map((event) => annotateEvent(event, districts, factions));
};

export const drawEventsForDay = (day, resolvedIds, count = 6) =>
  generateDailyAlerts({ day, activeTeamSize: Math.max(2, count - 1), resolvedIds }).slice(0, count);

const initialApplicants = () => applicantData.map(normalizeApplicant);
const initialVillains = () => villainData.map(normalizeVillain).map(normalizeVillainLifecycle);

const defaultDispatcher = () =>
  createDispatcher({
    name: "Operador Migrado",
    callsign: "Central",
    pronoun: "",
    backgroundId: "emergency_operator",
    personalityId: "empathetic_mentor",
  });

const sourceStatKey = {
  event_variant: "eventVariantUsed",
  assembled: "assembledUsed",
  fallback: "fallbackUsed",
};

const buildPlayByPlayForMission = (mission, state) => {
  const narrativeContext = buildMissionNarrativeContext(mission.event, mission, state);
  const playByPlay = generateMissionPlayByPlay(narrativeContext, undefined, state);

  return {
    ...mission,
    playByPlay,
    headlineSeeds: [...(mission.headlineSeeds ?? []), ...(playByPlay.seeds?.headlineSeeds ?? [])],
    socialSeeds: [...(mission.socialSeeds ?? []), ...(playByPlay.seeds?.socialSeeds ?? [])],
    legacySeeds: [...(mission.legacySeeds ?? []), ...(playByPlay.seeds?.legacySeeds ?? [])],
  };
};

const trackPlayByPlayUse = (state, mission) => {
  const playByPlay = mission?.playByPlay;
  if (!playByPlay) {
    return {
      recentPlayByPlay: state.recentPlayByPlay ?? [],
      playByPlayStats: state.playByPlayStats ?? initialPlayByPlayStats(),
    };
  }

  const stats = {
    ...initialPlayByPlayStats(),
    ...(state.playByPlayStats ?? {}),
    generated: (state.playByPlayStats?.generated ?? 0) + 1,
  };
  const key = sourceStatKey[playByPlay.source] ?? "fallbackUsed";
  stats[key] = (stats[key] ?? 0) + 1;

  return {
    recentPlayByPlay: rememberUsedPlayByPlay(playByPlay.usedVariantIds ?? [playByPlay.id], state, {
      eventId: mission.event?.id,
      day: mission.day,
      tone: playByPlay.tone,
      firstLine: playByPlay.beats?.[0]?.text ?? "",
      id: playByPlay.id,
    }),
    playByPlayStats: stats,
  };
};

export const createInitialGameState = ({ dispatcher = defaultDispatcher(), initialHeroIds = defaultInitialHeroIds } = {}) => {
  const chosen = initialHeroIds.slice(0, 3);
  const initialHeroes = heroData.map((hero, index) => cloneHero(hero, index, chosen));
  const activeSize = activeTeamCount(initialHeroes);
  const districts = initializeDistricts();
  const factions = initializeFactions();
  const chains = initializeEventChains();
  const activeEvents = generateDailyAlerts({
    day: 1,
    activeTeamSize: activeSize,
    districts,
    factions,
    activeChains: chains.activeEventChains,
    resolvedIds: [],
  });

  return {
    version: "0.9.5-alpha Missões Cinematográficas",
    saveVersion: SAVE_VERSION,
    day: 1,
    cityName: "Nova Aurora",
    cityStatus: "em alerta operacional",
    reputation: 62,
    budget: 76000,
    activeHeroLimit: ACTIVE_TEAM_LIMIT,
    dispatcher: normalizeDispatcherProgression(dispatcher),
    heroes: initialHeroes,
    memorial: [],
    relationships: buildInitialRelationships(initialHeroes),
    schedule: initializeSchedule(initialHeroes),
    teamMorale: calculateTeamMorale({ heroes: initialHeroes, reputation: 62 }),
    trainingAssignments: [],
    unlockedCombos: [],
    comboHistory: [],
    heroArcs: initializeHeroArcs(),
    recentTeamScenes: [],
    dailyTrainingLog: [],
    districts: markDistrictAlertsGenerated(districts, activeEvents),
    factions,
    activeEventChains: chains.activeEventChains,
    completedEventChains: chains.completedEventChains,
    discoveredClues: chains.discoveredClues,
    socialPosts: [],
    baseUpgrades: initializeBaseUpgrades(),
    commandObjectives: [],
    custody: { capacity: 8, security: 1, dailyCost: 850, publicPressure: 20 },
    reformPrograms: [],
    informants: [],
    rivalries: [],
    retaliationHistory: [],
    rivalOrganizations: initializeRivalOrganizations(),
    seasonArcs: initializeSeasonArc(),
    crisisMissions: initializeCrisisMissions(),
    cityLegacy: initializeCityLegacy(),
    uiSettings: { density: "comfortable" },
    cityHistory: [],
    activeEvents,
    resolvedEventIds: [],
    applicants: initialApplicants(),
    villains: initialVillains(),
    dailyLog: [],
    history: [],
    dayReports: [],
    newspapers: [],
    budgetLog: [],
    baseScenes: [],
    commandEvents: [],
    recentDialogues: [],
    recentPlayByPlay: [],
    playByPlayStats: initialPlayByPlayStats(),
    lastReport: null,
    lastNewspaper: null,
    lastMission: null,
  };
};

const migrateHeroes = (savedHeroes, freshHeroes) => {
  const source = savedHeroes?.length ? savedHeroes : freshHeroes;
  const activeIds = source
    .filter((hero) => hero.teamStatus === "active_team" || hero.rosterStatus === "ativo" || hero.status === "disponivel")
    .slice(0, 3)
    .map((hero) => hero.id);
  const chosen = activeIds.length ? activeIds : defaultInitialHeroIds;

  return source.map((hero, index) => cloneHero(hero, index, chosen)).map((hero) => {
    if (hero.teamStatus === "active_team" && chosen.includes(hero.id)) return hero;
    if (!chosen.includes(hero.id) && hero.teamStatus === "active_team") return { ...hero, teamStatus: "available_global", rosterStatus: "available_global", scheduleStatus: "reserve" };
    return hero;
  });
};

export const hydrateGameState = (savedState) => {
  const fresh = createInitialGameState();
  if (!savedState) return fresh;

  const migrated = migrateSaveToCurrent(savedState);
  const heroes = migrateHeroes(migrated.heroes, fresh.heroes);
  const applicants = (migrated.applicants ?? fresh.applicants).map(normalizeApplicant);
  const villains = (migrated.villains ?? fresh.villains).map(normalizeVillain).map(normalizeVillainLifecycle);
  const districts = migrated.districts?.length ? migrated.districts : fresh.districts;
  const factions = migrated.factions?.length ? migrated.factions : fresh.factions;
  const activeSize = activeTeamCount(heroes);
  const resolvedIds = migrated.resolvedEventIds ?? [];
  const activeEvents = migrated.activeEvents?.length
    ? migrated.activeEvents.map((event) => annotateEvent(event, districts, factions))
    : generateDailyAlerts({
        day: migrated.day ?? 1,
        activeTeamSize: activeSize,
        districts,
        factions,
        activeChains: migrated.activeEventChains ?? [],
        commandObjectives: migrated.commandObjectives ?? [],
        resolvedIds,
      });

  return {
    ...fresh,
    ...migrated,
    version: "0.9.5-alpha Missões Cinematográficas",
    saveVersion: SAVE_VERSION,
    dispatcher: normalizeDispatcherProgression(migrated.dispatcher ?? fresh.dispatcher),
    heroes,
    applicants,
    villains,
    districts,
    factions,
    activeEventChains: migrated.activeEventChains ?? [],
    completedEventChains: migrated.completedEventChains ?? [],
    discoveredClues: migrated.discoveredClues ?? [],
    socialPosts: migrated.socialPosts ?? [],
    baseUpgrades: migrated.baseUpgrades?.length ? migrated.baseUpgrades : initializeBaseUpgrades(),
    commandObjectives: migrated.commandObjectives ?? [],
    cityHistory: migrated.cityHistory ?? [],
    memorial: migrated.memorial ?? fresh.memorial,
    relationships: migrated.relationships ?? buildInitialRelationships(heroes),
    schedule: migrated.schedule?.length ? migrated.schedule : initializeSchedule(heroes),
    teamMorale: migrated.teamMorale ?? calculateTeamMorale({ ...migrated, heroes }),
    trainingAssignments: migrated.trainingAssignments ?? [],
    unlockedCombos: migrated.unlockedCombos ?? [],
    comboHistory: migrated.comboHistory ?? [],
    heroArcs: migrated.heroArcs?.length ? migrated.heroArcs : initializeHeroArcs(),
    recentTeamScenes: migrated.recentTeamScenes ?? [],
    dailyTrainingLog: migrated.dailyTrainingLog ?? [],
    activeEvents,
    budget: migrated.budget ?? fresh.budget,
    activeHeroLimit: ACTIVE_TEAM_LIMIT,
    budgetLog: migrated.budgetLog ?? [],
    dayReports: migrated.dayReports ?? [],
    newspapers: migrated.newspapers ?? [],
    commandEvents: migrated.commandEvents ?? [],
    recentDialogues: migrated.recentDialogues ?? [],
    recentPlayByPlay: migrated.recentPlayByPlay ?? [],
    playByPlayStats: { ...initialPlayByPlayStats(), ...(migrated.playByPlayStats ?? {}) },
    baseScenes: migrated.baseScenes ?? [],
    custody: migrated.custody ?? fresh.custody,
    reformPrograms: migrated.reformPrograms ?? [],
    informants: migrated.informants ?? [],
    rivalries: migrated.rivalries ?? [],
    retaliationHistory: migrated.retaliationHistory ?? [],
    rivalOrganizations: migrated.rivalOrganizations?.length ? migrated.rivalOrganizations : initializeRivalOrganizations(),
    seasonArcs: migrated.seasonArcs?.length ? migrated.seasonArcs : initializeSeasonArc(),
    crisisMissions: migrated.crisisMissions ?? initializeCrisisMissions(),
    cityLegacy: migrated.cityLegacy ?? initializeCityLegacy(),
    uiSettings: { density: migrated.uiSettings?.density ?? "comfortable" },
  };
};

const budgetEntry = (mission) => ({
  id: `budget-mission-${mission.id}`,
  day: mission.day,
  type: mission.budgetDelta >= 0 ? "income" : "expense",
  label: mission.success ? `Verba liberada: ${mission.event.titulo}` : `Custo emergencial: ${mission.event.titulo}`,
  amount: Math.abs(mission.budgetDelta),
});

const applyMissionHeroUpdates = (heroes, mission) => {
  const heroUpdateMap = new Map(mission.heroUpdates.map((update) => [update.heroId, update.nextHero]));
  const deathIds = new Set(mission.deaths.map((death) => death.heroId));

  return heroes.map((hero) => {
    const rawUpdated = heroUpdateMap.get(hero.id) ?? hero;
    const updated = mission.heroIds.includes(hero.id) && rawUpdated.status !== "morto" ? applyMissionFatigue(rawUpdated, mission) : rawUpdated;
    if (!deathIds.has(hero.id) && mission.deaths.length > 0 && hero.status !== "morto") {
      const stressed = {
        ...updated,
        estresse: Math.min(100, updated.estresse + 10),
        moral: Math.max(0, (updated.moral ?? 70) - 8),
        traumas: [...(updated.traumas ?? []), { day: mission.day, source: `Luto por ${mission.deaths[0].codinome}` }],
      };
      return { ...stressed, status: heroOperationalStatus(stressed) };
    }

    return updated;
  });
};

const applySocialPostsToHeroes = (heroes, posts) =>
  heroes.map((hero) => {
    const heroPosts = posts.filter((post) => post.heroId === hero.id);
    if (!heroPosts.length) return hero;
    const fameDelta = heroPosts.reduce((sum, post) => sum + (post.impact?.heroFameChange ?? 0), 0);
    return {
      ...hero,
      fame: Math.max(0, Math.min(100, (hero.fame ?? 0) + fameDelta)),
      recentPosts: [...heroPosts.map((post) => ({ day: post.day, text: post.text, tone: post.tone })), ...(hero.recentPosts ?? [])].slice(0, 8),
    };
  });

const applySocialPostsToDistricts = (districts, posts) =>
  districts.map((district) => {
    const delta = posts
      .filter((post) => post.districtId === district.id)
      .reduce((sum, post) => sum + (post.impact?.districtTrustChange ?? 0), 0);
    if (!delta) return district;
    return {
      ...district,
      trustInCentral: Math.max(0, Math.min(100, district.trustInCentral + delta)),
      populationMood: Math.max(0, Math.min(100, district.populationMood + delta)),
    };
  });

const progressVillainPrograms = (state) => {
  const events = [];
  const villains = (state.villains ?? []).map((villain) => {
    const status = villain.status ?? villain.estadoAtual;
    if (!["em_reabilitacao", "em reabilitacao", "em reabilitação"].includes(status)) return villain;
    const mentor = state.heroes.find((hero) => hero.id === villain.assignedMentorHeroId) ??
      [...state.heroes].filter((hero) => hero.status !== "morto").sort((a, b) => (b.atributos?.carisma ?? 0) - (a.atributos?.carisma ?? 0))[0];
    const progressed = progressRehabilitation(villain, mentor, state.dispatcher, state.baseUpgrades);
    const event = checkRehabilitationEvent(progressed, state);
    if (event) events.push(event);
    return progressed;
  });

  return {
    ...state,
    villains,
    rehabilitationEvents: [...events, ...(state.rehabilitationEvents ?? [])].slice(0, 40),
  };
};

export const dispatchTeamToEvent = async (state, eventId, heroIds) => {
  const event = state.activeEvents.find((candidate) => candidate.id === eventId);
  const team = heroIds
    .map((heroId) => state.heroes.find((hero) => hero.id === heroId))
    .filter((hero) => hero && isMissionAvailableHero(hero));

  if (!event || team.length < 1 || team.length > 3) return { state, mission: null };

  const rawMission = await resolveMission({
    event,
    team,
    relationships: state.relationships,
    villains: state.villains,
    day: state.day,
    dispatcher: state.dispatcher,
    recentDialogues: state.recentDialogues,
    baseUpgrades: state.baseUpgrades,
    teamMorale: state.teamMorale,
    unlockedCombos: state.unlockedCombos,
  });
  const district = getDistrictById(state.districts, event.districtId) ?? getDistrictById(state.districts, districtIdFromName(event.bairro));
  const districtPublicDelta = event.cityModifiers?.[rawMission.success ? "reputationSuccessModifier" : "reputationFailureModifier"] ?? 0;
  const mission = buildPlayByPlayForMission({
    ...rawMission,
    reputationDelta: rawMission.reputationDelta + districtPublicDelta,
    districtImpact: { districtId: district?.id, districtName: district?.name },
    factionImpact: { factionId: event.factionId, factionName: getFactionById(state.factions, event.factionId)?.name },
  }, state);
  const playByPlayTracking = trackPlayByPlayUse(state, mission);
  const capturedVillainList = mission.capturedVillain ? captureVillain(state.villains, mission.capturedVillain.id, mission) : state.villains;
  const nextVillains = capturedVillainList.map((villain) => updateVillainAfterMission(villain, mission));
  const updatedHeroes = applyMissionHeroUpdates(state.heroes, mission);
  const nextHeroes = applyMissionResultToHeroesFame(updatedHeroes, mission, district);
  const nextDistricts = applyMissionResultToDistricts(state.districts, mission);
  const nextFactions = applyMissionResultToFactions(state.factions, mission);
  const nextReputation = Math.max(0, Math.min(100, state.reputation + mission.reputationDelta));
  const nextBudget = Math.max(0, state.budget + mission.budgetDelta);
  const chainState = advanceEventChainsAfterMission(
    {
      activeEventChains: state.activeEventChains,
      completedEventChains: state.completedEventChains,
      discoveredClues: state.discoveredClues,
    },
    mission,
  );

  const unlockedFromMission = mission.activeCombos?.map((combo) => combo.id) ?? [];
  const nextState = recordLegacyFromMission({
    ...state,
    reputation: nextReputation,
    budget: nextBudget,
    heroes: nextHeroes,
    memorial: [...state.memorial, ...mission.deaths],
    villains: nextVillains,
    districts: nextDistricts,
    factions: nextFactions,
    activeEventChains: chainState.activeEventChains,
    completedEventChains: chainState.completedEventChains,
    discoveredClues: chainState.discoveredClues,
    relationships: mission.relationships,
    activeEvents: state.activeEvents.filter((candidate) => candidate.id !== eventId),
    resolvedEventIds: [...state.resolvedEventIds, eventId],
    dailyLog: [...state.dailyLog, mission],
    history: [...state.history, mission],
    budgetLog: [...state.budgetLog, budgetEntry(mission)],
    teamMorale: Math.max(0, Math.min(100, (state.teamMorale ?? 60) + (mission.success ? 1 : -2) - mission.deaths.length * 10)),
    unlockedCombos: [...new Set([...(state.unlockedCombos ?? []), ...unlockedFromMission])],
    comboHistory: [
      ...unlockedFromMission.map((comboId) => ({ id: comboId, day: state.day, reason: "ativado em missão" })),
      ...(state.comboHistory ?? []),
    ].slice(0, 30),
    recentPlayByPlay: playByPlayTracking.recentPlayByPlay,
    playByPlayStats: playByPlayTracking.playByPlayStats,
    recentDialogues: [{ id: mission.dialogue?.id, day: state.day }, ...(state.recentDialogues ?? [])]
      .filter((entry) => entry.id)
      .slice(0, 80),
    lastMission: mission,
  }, mission);

  return { state: nextState, mission };
};

export const sendTeamToEvent = async (state, eventId, heroIds) => (await dispatchTeamToEvent(state, eventId, heroIds)).state;

const buildMissedMission = (event, day, state) =>
  buildPlayByPlayForMission(
    {
      id: `missed-${event.id}-${Date.now()}`,
      day,
      event,
      heroIds: [],
      heroNames: [],
      chance: 0,
      roll: 100,
      success: false,
      resultType: "alerta_perdido",
      outcome: "alerta perdido",
      narrative: `Sem equipe designada, o alerta em ${event.bairro} evoluiu até os serviços civis assumirem em condições ruins.`,
      reputationDelta: -Math.max(2, event.nivelRisco * 2) + (event.cityModifiers?.reputationFailureModifier ?? 0),
      budgetDelta: -Math.round(event.nivelRisco * 650 + event.dificuldade * 14),
      civiliansSaved: 0,
      materialDamage: event.nivelRisco >= 4 ? "alto" : "médio",
      experienceGain: 0,
      heroUpdates: [],
      relationshipChanges: [],
      injuries: [],
      deaths: [],
      capturedVillain: null,
      dialogue: null,
      activeCombos: [],
      emotionalConsequences: ["a cidade percebeu a ausência da Central"],
      districtImpact: { districtId: event.districtId, districtName: event.bairro },
      factionImpact: { factionId: event.factionId },
      breakdown: { chance: 0, capability: 0, fatiguePenalty: 0, relationBonus: 0, roleBonus: 0, injuryRisk: 0, deathRisk: 0 },
    },
    { ...state, day },
  );

const restHeroes = (heroes, baseUpgrades = []) =>
  tickCommandAssignments(heroes).map((hero) => {
    if (hero.status === "morto" || hero.teamStatus === "dead") return hero;

    const recoveryBonus = baseUpgradeEffect(baseUpgrades, "injuryRecoveryBonus");
    const nextInjuries = (hero.ferimentos ?? [])
      .map((injury) => ({ ...injury, daysRemaining: injury.daysRemaining - 1 - recoveryBonus }))
      .filter((injury) => injury.daysRemaining > 0);
    const recoveredHero = {
      ...hero,
      ferimentos: nextInjuries,
      energia: Math.min(100, hero.energia + 22 + Math.round(hero.atributos.resistencia * 0.8)),
      estresse: Math.max(0, hero.estresse - 12 - Math.round(hero.atributos.carisma * 0.35) - baseUpgradeEffect(baseUpgrades, "stressReduction")),
      moral: Math.min(100, (hero.moral ?? 70) + 2),
    };

    recoveredHero.status = heroOperationalStatus(recoveredHero);

    return progressInjuryRecovery({ ...recoveredHero, ferimentos: hero.ferimentos ?? [], injuries: hero.injuries ?? hero.ferimentos ?? [] }, baseUpgrades);
  });

const evaluateCommandObjectives = (objectives = [], fullLog, day) => {
  let reputationDelta = 0;
  let budgetDelta = 0;
  const budgetEntries = [];
  const nextObjectives = objectives.map((objective) => {
    if (objective.status !== "active") return objective;
    const completed =
      objective.type === "district_support"
        ? fullLog.some((mission) => mission.success && mission.event.districtId === objective.districtId)
        : objective.type === "faction_pressure"
          ? fullLog.some((mission) => mission.success && mission.event.factionId === objective.factionId)
          : false;

    if (completed) {
      reputationDelta += objective.reward?.reputation ?? 0;
      budgetDelta += objective.reward?.budget ?? 0;
      if (objective.reward?.budget) {
        budgetEntries.push({
          id: `budget-objective-${objective.id}-${Date.now()}`,
          day,
          type: "income",
          label: `Objetivo do Comando: ${objective.label}`,
          amount: objective.reward.budget,
        });
      }
      return { ...objective, status: "completed", completedDay: day };
    }

    if (objective.deadlineDay <= day) {
      reputationDelta += objective.penalty?.reputation ?? 0;
      return { ...objective, status: "failed", completedDay: day };
    }

    return objective;
  });

  return {
    objectives: nextObjectives.slice(0, 8),
    reputationDelta,
    budgetDelta,
    budgetEntries,
  };
};

export const endDay = (state) => {
  const missed = state.activeEvents.map((event) => buildMissedMission(event, state.day, state));
  const missedPlayByPlayTracking = missed.reduce(
    (trackingState, mission) => ({
      ...trackingState,
      ...trackPlayByPlayUse(trackingState, mission),
    }),
    {
      recentPlayByPlay: state.recentPlayByPlay ?? [],
      playByPlayStats: state.playByPlayStats ?? initialPlayByPlayStats(),
      day: state.day,
    },
  );
  const fullLog = [...state.dailyLog, ...missed];
  const reputationAfterMissed = missed.reduce(
    (value, mission) => Math.max(0, Math.min(100, value + mission.reputationDelta)),
    state.reputation,
  );
  const budgetAfterMissed = missed.reduce((value, mission) => Math.max(0, value + mission.budgetDelta), state.budget);
  const budgetEntries = missed.map(budgetEntry);
  const objectiveEvaluation = evaluateCommandObjectives(state.commandObjectives, fullLog, state.day);
  const reputationAfterObjectives = Math.max(0, Math.min(100, reputationAfterMissed + objectiveEvaluation.reputationDelta));
  const budgetAfterObjectives = Math.max(0, budgetAfterMissed + objectiveEvaluation.budgetDelta);
  let districtsAfterMissed = state.districts;
  let factionsAfterMissed = state.factions;
  missed.forEach((mission) => {
    districtsAfterMissed = applyMissionResultToDistricts(districtsAfterMissed, mission);
    factionsAfterMissed = applyMissionResultToFactions(factionsAfterMissed, mission);
  });

  const resolvedDistrictIds = [...new Set(state.dailyLog.map((mission) => mission.event.districtId).filter(Boolean))];
  const districtsAfterDecay = applyDailyDistrictDecay(districtsAfterMissed, resolvedDistrictIds);
  const factionTick = applyDailyFactionTick(factionsAfterMissed, districtsAfterDecay, state.day + 1);
  const dayBudgetEntries = [...state.budgetLog, ...budgetEntries, ...objectiveEvaluation.budgetEntries].filter((entry) => entry.day === state.day);
  const dayIncome = dayBudgetEntries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
  const dayExpenses = dayBudgetEntries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
  const tiredHeroes = [...state.heroes]
    .filter((hero) => hero.status !== "morto")
    .sort((first, second) => second.estresse + (100 - second.energia) - (first.estresse + (100 - first.energia)))
    .slice(0, 4)
    .map((hero) => ({
      id: hero.id,
      codinome: hero.codinome,
      energia: hero.energia,
      estresse: hero.estresse,
      status: hero.status,
    }));
  const relationshipChanges = fullLog.flatMap((mission) => mission.relationshipChanges);
  const report = {
    day: state.day,
    resolved: fullLog.filter((mission) => mission.success),
    failures: fullLog.filter((mission) => !mission.success),
    reputation: reputationAfterObjectives,
    budget: budgetAfterObjectives,
    dayIncome,
    dayExpenses,
    civiliansSaved: fullLog.reduce((sum, mission) => sum + (mission.civiliansSaved ?? 0), 0),
    villainsCaptured: fullLog.filter((mission) => mission.capturedVillain).length,
    heroesInjured: fullLog.reduce((sum, mission) => sum + (mission.injuries?.length ?? 0), 0),
    heroesKilled: fullLog.reduce((sum, mission) => sum + (mission.deaths?.length ?? 0), 0),
    districtChanges: fullLog.map((mission) => mission.districtImpact).filter(Boolean),
    factionEvents: factionTick.factionEvents,
    tiredHeroes,
    relationshipChanges,
  };
  const scene = generateBaseScene(state);
  const teamScene = generateTeamScene({ ...state, teamMorale: state.teamMorale ?? calculateTeamMorale(state) });
  const recoverySeed = progressTraining(
    applyScheduleEndOfDayRecovery({
      ...state,
      heroes: restHeroes(state.heroes, state.baseUpgrades),
    }),
  );
  const restedHeroes = recoverySeed.heroes;
  const posts = generateSocialPosts(report, fullLog, restedHeroes, districtsAfterDecay, factionTick.factions);
  const districtsAfterSocial = applySocialPostsToDistricts(districtsAfterDecay, posts);
  const socialDelta = applySocialImpactToReputation(posts);
  const finalReputation = Math.max(0, Math.min(100, reputationAfterObjectives + socialDelta));
  const dispatcher = grantDispatcherDayXp(state.dispatcher, report, finalReputation);
  const commandEvent = generateCommandEvent(
    { ...state, reputation: finalReputation, heroes: restedHeroes, districts: districtsAfterSocial, factions: factionTick.factions, socialPosts: posts },
    report,
  );
  const commandSeed = applyCommandEvent(
    {
      ...state,
      reputation: finalReputation,
      budget: budgetAfterObjectives,
      heroes: restedHeroes,
      districts: districtsAfterSocial,
      factions: factionTick.factions,
      commandObjectives: objectiveEvaluation.objectives,
      commandEvents: state.commandEvents ?? [],
      budgetLog: [...state.budgetLog, ...budgetEntries, ...objectiveEvaluation.budgetEntries],
      trainingAssignments: recoverySeed.trainingAssignments ?? state.trainingAssignments ?? [],
      dailyTrainingLog: recoverySeed.dailyTrainingLog ?? state.dailyTrainingLog ?? [],
    },
    commandEvent,
  );
  const nextResolvedIds = [...state.resolvedEventIds, ...missed.map((mission) => mission.event.id)];
  const nextDay = state.day + 1;
  const rehabilitatedSeed = progressVillainPrograms(commandSeed);
  const custodySeed = applyCustodyDailyTick(rehabilitatedSeed);
  const rivalSeed = applyDailyRivalOrganizationTick(custodySeed);
  const systemSeed = checkSeasonProgress(rivalSeed);
  const systemicEvents = [generateRetaliationEvent(systemSeed), generateCrisisEvent(systemSeed), generateSeasonEvent(systemSeed)].filter(Boolean);
  const activeSize = activeTeamCount(systemSeed.heroes);
  const nextEvents = generateDailyAlerts({
    day: nextDay,
    activeTeamSize: activeSize,
    districts: systemSeed.districts,
    factions: systemSeed.factions,
    activeChains: state.activeEventChains,
    commandObjectives: systemSeed.commandObjectives,
    factionEvents: [...factionTick.factionEvents, ...systemicEvents],
    resolvedIds: nextResolvedIds,
    reputation: finalReputation,
  });
  const nextDistricts = markDistrictAlertsGenerated(systemSeed.districts, nextEvents);
  const heroesWithPosts = applySocialPostsToHeroes(systemSeed.heroes, posts);
  const newspaper = generateNewspaper({
    report: { ...report, reputation: finalReputation, socialDelta },
    missions: [...state.history, ...missed],
    heroes: heroesWithPosts,
    villains: systemSeed.villains,
    districts: nextDistricts,
    factions: systemSeed.factions,
    socialPosts: posts,
    commandEvent,
    dispatcher,
    activeChains: state.activeEventChains,
  });
  const nextTeamMorale = applyDailyMoraleChanges({ ...systemSeed, heroes: heroesWithPosts, reputation: finalReputation }, { ...report, socialDelta });
  const baseNextState = {
    ...systemSeed,
    day: nextDay,
    reputation: finalReputation,
    budget: systemSeed.budget,
    dispatcher,
    heroes: heroesWithPosts,
    districts: nextDistricts,
    factions: systemSeed.factions,
    activeEvents: nextEvents,
    resolvedEventIds: nextResolvedIds,
    dailyLog: [],
    history: [...state.history, ...missed],
    budgetLog: systemSeed.budgetLog,
    trainingAssignments: systemSeed.trainingAssignments ?? [],
    dailyTrainingLog: systemSeed.dailyTrainingLog ?? [],
    recentPlayByPlay: missedPlayByPlayTracking.recentPlayByPlay,
    playByPlayStats: missedPlayByPlayTracking.playByPlayStats,
    teamMorale: nextTeamMorale,
    dayReports: [{ ...report, reputation: finalReputation, socialDelta }, ...state.dayReports].slice(0, 40),
    newspapers: [newspaper, ...(state.newspapers ?? [])].slice(0, 60),
    socialPosts: [...posts, ...(state.socialPosts ?? [])].slice(0, 160),
    cityHistory: [
      {
        day: state.day,
        reputation: finalReputation,
        mostDangerousDistricts: getMostDangerousDistricts(nextDistricts, 3).map((district) => district.id),
        factionEvents: factionTick.factionEvents.map((event) => event.id),
      },
      ...(state.cityHistory ?? []),
    ].slice(0, 80),
    lastReport: { ...report, reputation: finalReputation, socialDelta },
    lastNewspaper: newspaper,
    lastMission: null,
    cityStatus:
      finalReputation < 35 ? "em crise de confiança" : finalReputation > 78 ? "confiante na Central" : "em alerta operacional",
  };

  return checkHeroArcTriggers(applyBaseScene(applyTeamScene(baseNextState, teamScene), scene));
};
