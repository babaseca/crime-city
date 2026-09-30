import { heroes as heroData } from "../data/heroes";
import alphaHeroData from "../data/alpha095_new_heroes_180.json";
import { events } from "../data/events";
import { alpha100Events } from "../data/alpha100/eventAdapter";
import { alpha11VerticalMissions } from "../data/alpha11TestMissions";
import { alphaPackageHeroes, alphaPackageVillainIds, alphaPackageVillains, alphaPackageVersion } from "../data/alpha11_12/packageAdapters";
import { alpha11HeroIds, enrichHeroPersonalProfile } from "../data/heroPersonalities";
import applicantData from "../data/applicants.json";
import villainData from "../data/villains.json";
import alphaVillainData from "../data/alpha095_new_villains_300.json";
import { USE_ALPHA100_EVENTS } from "../config/featureFlags";
import { resolveHeroPortrait } from "../data/portraitAssets";
import { normalizeDisplayText } from "../utils/formatters";
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
import { buildInitialRelationships, normalizeRelationships } from "./relationships";
import { generateRetaliationEvent } from "./retaliationSystem";
import { applyDailyRivalOrganizationTick, initializeRivalOrganizations } from "./rivalOrganizationSystem";
import { normalizeHeroSchedule, initializeSchedule, applyScheduleEndOfDayRecovery } from "./scheduleSystem";
import { checkSeasonProgress, generateSeasonEvent, initializeSeasonArc } from "./seasonArcSystem";
import { heroOperationalStatus, resolveMission } from "./mission";
import { generateNewspaper } from "./newspaperSystem";
import { normalizeApplicant } from "./recruitmentSystem";
import { migrateSaveToCurrent } from "./saveMigrationSystem";
import { ensureAlphaCaseState, initializeAlphaCaseState, intakeCapturedVillainCase } from "./alphaCaseSystem";
import { appendAuditEvent, createCampaignSeed, makeAuditEvent } from "./seededRng";
import { initialPlayByPlayStats } from "./saveMigration090";
import { applySocialImpactToReputation, generateSocialPosts } from "./socialSystem";
import { applyPostMissionTeamScene, applyTeamScene, generateBaseScene as generateTeamScene, generatePostMissionTeamScene } from "./teamSceneSystem";
import { applyDailyMoraleChanges, calculateTeamMorale } from "./teamMoraleSystem";
import { progressTraining } from "./trainingSystem";
import { captureVillain, normalizeVillain } from "./villainSystem";
import { normalizeVillainLifecycle, updateVillainAfterMission } from "./villainLifecycleSystem";
import { checkRehabilitationEvent, progressRehabilitation } from "./villainReformSystem";
import { buildMissionNarrativeContext } from "./playByPlayContext";
import { generateMissionPlayByPlay, rememberUsedPlayByPlay } from "./playByPlaySystem";
import { calculateMissionReactions } from "./missionReactionSystem";
import { applyBudgetFloorRules, balanceConfigVersion, calculateDailyCosts, calculateDailyOperationalGrant, startingBudget } from "./economySystem";
import { POOL_VERSION_095 } from "./saveMigration095";

export const SAVE_VERSION = "1.2.0";
export const ACTIVE_TEAM_LIMIT = 8;

const defaultInitialHeroIds = alpha11HeroIds;
export const initialTeamCandidateIds = alpha11HeroIds;

const activeTeamStatuses = ["active_team", "assigned_by_command", "reformed_villain"];
const baseVillainIds = new Set(villainData.map((villain) => villain.id));
const combinedHeroData = [...alphaPackageHeroes, ...heroData, ...alphaHeroData];
const combinedVillainData = [...alphaPackageVillains, ...villainData, ...alphaVillainData];
const alpha11HeroIdSet = new Set(alpha11HeroIds);
const alphaVillainIdSet = new Set(alphaPackageVillainIds);

export const isMissionAvailableHero = (hero) =>
  hero.isAlphaActive &&
  activeTeamStatuses.includes(hero.teamStatus) &&
  (hero.scheduleStatus ?? "on_duty") === "on_duty" &&
  !["morto", "ferido", "exausto"].includes(hero.status);

export const activeTeamCount = (heroes) => heroes.filter((hero) => hero.isAlphaActive && activeTeamStatuses.includes(hero.teamStatus) && hero.status !== "morto").length;

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

  return normalizeHeroSchedule(normalizeHeroInjuries(normalizeHeroFame(enrichHeroPersonalProfile({
    ...hero,
    imageUrl: resolveHeroPortrait(hero, hero.imageUrl),
    atributos: { ...(hero.atributos ?? hero.stats ?? {}) },
    tracos: [...(hero.tracos ?? []), ...(hero.tracosPositivos ?? []).filter((trait) => !(hero.tracos ?? []).includes(trait))],
    bio:
      hero.bio ??
      hero.biografia ??
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
  }))));
};

const normalizeAlpha11Roster = (heroes = []) =>
  heroes.map((hero) => {
    if (alpha11HeroIdSet.has(hero.id)) {
      if (hero.status === "morto" || hero.teamStatus === "dead") {
        return { ...hero, isAlphaActive: true, alpha11Focus: true };
      }

      return {
        ...hero,
        isAlphaActive: true,
        alpha11Focus: true,
        teamStatus: "active_team",
        rosterStatus: "active_team",
        scheduleStatus: "on_duty",
      };
    }

    if (activeTeamStatuses.includes(hero.teamStatus)) {
      return {
        ...hero,
        isAlphaActive: false,
        archivedLegacy: true,
        spawnEnabled: false,
        selectable: false,
        teamStatus: "available_global",
        rosterStatus: "available_global",
        scheduleStatus: "reserve",
      };
    }

    return { ...hero, isAlphaActive: false, archivedLegacy: true, spawnEnabled: false, selectable: false };
  });

const seededIndex = (day, index, max) => (day * 37 + index * 19 + day * index * 7) % Math.max(1, max);

const stableEventSeed = (value = "") => {
  let hash = 0;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const difficultyModifierFor = (district, event) =>
  getDistrictModifiersForEvent(district, event).reduce((sum, modifier) => sum + (modifier.effect?.difficultyModifier ?? 0), 0);

const publicModifierFor = (district, event, success) =>
  getDistrictModifiersForEvent(district, event).reduce(
    (sum, modifier) => sum + (success ? modifier.effect?.reputationSuccessModifier ?? 0 : modifier.effect?.reputationFailureModifier ?? 0),
    0,
  );

const normalizeEventDisplayFields = (event) => ({
  ...event,
  titulo: normalizeDisplayText(event.titulo),
  descricao: normalizeDisplayText(event.descricao),
  bairro: normalizeDisplayText(event.bairro),
  faccao: normalizeDisplayText(event.faccao),
  vilao: normalizeDisplayText(event.vilao),
  villainName: normalizeDisplayText(event.villainName),
  limiteTempoNarrativo: normalizeDisplayText(event.limiteTempoNarrativo),
});

const annotateEvent = (event, districts, factions, preferredDistrict = null) => {
  const district = preferredDistrict ?? getDistrictById(districts, event.districtId) ?? getDistrictById(districts, districtIdFromName(event.bairro));
  if (!district) return normalizeEventDisplayFields(event);
  const factionId = event.factionId ?? (district.dangerLevel >= 45 ? district.dominantFactionId : null);
  const faction = getFactionById(factions, factionId);
  const difficultyModifier = difficultyModifierFor(district, event) + (faction ? Math.round(faction.threatLevel / 30) : 0);
  const factionTags = faction?.tags?.slice(0, 2) ?? [];

  return normalizeEventDisplayFields({
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
  });
};

const alpha100EventScore = (event, params) => {
  const {
    activeFactionIds,
    activeSize,
    commandObjectives,
    day,
    dangerousDistrictIds,
    knownVillainIds,
    objectiveDistrictId,
    pressureByDistrict,
  } = params;
  const pressure = pressureByDistrict.get(event.districtId) ?? 0;
  const commandObjectiveMatch = commandObjectives.some(
    (objective) =>
      objective.status === "active" &&
      [objective.districtId, objective.factionId, objective.villainId].some(Boolean) &&
      (objective.districtId === event.districtId || objective.factionId === event.factionId || objective.villainId === event.villainId),
  );

  return (
    pressure * 0.7 +
    (event.districtId === objectiveDistrictId ? 42 : 0) +
    (commandObjectiveMatch ? 35 : 0) +
    (activeFactionIds.has(event.factionId) ? 24 : 0) +
    (knownVillainIds.has(event.villainId) ? 18 : 6) +
    (dangerousDistrictIds.includes(event.districtId) ? 14 : 0) +
    Math.min(18, activeSize * 2) +
    (event.nivelRisco ?? 1) * 4 +
    stableEventSeed(`${event.id}:${day}`) / 0xffffffff
  );
};

const selectAlpha100Alerts = ({
  activeSize,
  commandObjectives,
  day,
  districts,
  factions,
  maxDifficulty,
  maxRisk,
  knownVillainIds: knownVillainIdsArg = [],
  resolvedIds,
  selected,
  targetCount,
}) => {
  const used = new Set(selected.map((event) => event.id));
  const resolved = new Set(resolvedIds);
  const knownVillainIds = new Set([...knownVillainIdsArg, ...commandObjectives.flatMap((objective) => [objective.villainId].filter(Boolean))]);
  const objectiveDistrictId = commandObjectives.find((objective) => objective.status === "active" && objective.districtId)?.districtId;
  const dangerousDistricts = getMostDangerousDistricts(districts, 6);
  const dangerousDistrictIds = dangerousDistricts.map((district) => district.id);
  const pressureByDistrict = new Map(districts.map((district) => [district.id, (district.dangerLevel ?? 0) + (district.crisis ? 18 : 0)]));
  const activeFactionIds = new Set(
    [...factions]
      .sort((first, second) => (second.heat ?? 0) + (second.threatLevel ?? 0) - ((first.heat ?? 0) + (first.threatLevel ?? 0)))
      .slice(0, Math.max(3, activeSize))
      .map((faction) => faction.id),
  );
  const basePool = alpha100Events.filter(
    (event) => !resolved.has(event.id) && !used.has(event.id) && event.nivelRisco <= maxRisk && event.dificuldade <= maxDifficulty,
  );
  const fallbackPool = alpha100Events.filter((event) => !resolved.has(event.id) && !used.has(event.id));
  const pool = basePool.length >= targetCount - selected.length ? basePool : fallbackPool;

  return pool
    .map((event) => ({
      event,
      score: alpha100EventScore(event, {
        activeFactionIds,
        activeSize,
        commandObjectives,
        day,
        dangerousDistrictIds,
        knownVillainIds,
        objectiveDistrictId,
        pressureByDistrict,
      }),
    }))
    .sort((first, second) => second.score - first.score)
    .slice(0, Math.max(0, targetCount - selected.length))
    .map((entry) => entry.event);
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
  const alpha11Events =
    day === 1
      ? alpha11VerticalMissions.filter((event) => !resolvedIds.includes(event.id)).slice(0, 1)
      : [];
  const specialEvents = [...alpha11Events, ...(params.factionEvents ?? []), ...chainEvents].slice(0, day <= 2 ? 1 : 2);
  const dangerousDistricts = getMostDangerousDistricts(districts, 6);
  const objectiveDistrictId = commandObjectives.find((objective) => objective.status === "active" && objective.districtId)?.districtId;
  const selected = [...specialEvents];
  const used = new Set(selected.map((event) => event.id));

  if (USE_ALPHA100_EVENTS && alpha100Events.length) {
    try {
      const alphaSelected = selectAlpha100Alerts({
        activeSize,
        commandObjectives,
        day,
        districts,
        factions,
        knownVillainIds: params.knownVillainIds ?? [],
        maxDifficulty,
        maxRisk,
        resolvedIds,
        selected,
        targetCount,
      });
      const alphaEvents = [...selected, ...alphaSelected].slice(0, targetCount);
      if (alphaEvents.length >= targetCount) {
        return alphaEvents.map((event) => annotateEvent(event, districts, factions));
      }
      alphaEvents.forEach((event) => {
        if (!used.has(event.id)) {
          selected.push(event);
          used.add(event.id);
        }
      });
    } catch {
      selected.splice(specialEvents.length);
      used.clear();
      specialEvents.forEach((event) => used.add(event.id));
    }
  }

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

const mergeById = (primary = [], additions = []) => {
  const seen = new Set();
  return [...primary, ...additions].filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const alphaVillainInitialVisibility = (villain) => {
  if (alphaVillainIdSet.has(villain.id)) return villain.visibility ?? "suspeito";
  if (baseVillainIds.has(villain.id)) return villain.visibility ?? "suspeito";
  const status = villain.estadoAtual ?? villain.status;
  if (["capturado", "preso", "em_reabilitacao", "em reabilitacao", "em reabilitação", "informante", "reformado", "aliado_condicional"].includes(status)) {
    return status;
  }
  if (status === "fugitivo" && ((villain.notoriety ?? 0) >= 65 || (villain.periculosidade ?? 0) >= 5)) return "suspeito";
  return villain.visibility ?? "desconhecido";
};

const normalizeAlphaVillainRoster = (villains = []) =>
  villains.map((villain) => {
    if (alphaVillainIdSet.has(villain.id)) {
      return {
        ...villain,
        isAlphaActiveVillain: true,
        spawnEnabled: true,
        archivedLegacy: false,
        visibility: villain.visibility ?? "suspeito",
      };
    }
    return {
      ...villain,
      isAlphaActiveVillain: false,
      spawnEnabled: false,
      archivedLegacy: true,
      visibility: villain.visibility ?? "desconhecido",
    };
  });

const initialApplicants = () => applicantData.map(normalizeApplicant);
const initialVillains = () =>
  normalizeAlphaVillainRoster(
    combinedVillainData
      .map((villain) => ({ ...villain, visibility: alphaVillainInitialVisibility(villain) }))
      .map(normalizeVillain)
      .map(normalizeVillainLifecycle),
  );

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

const alphaOutcomeConsequencesFor = (event, success) =>
  event?.consequencias?.[success ? "onSuccess" : "onFailure"] ?? {};

const buildPlayByPlayForMission = async (mission, state) => {
  const narrativeContext = buildMissionNarrativeContext(mission.event, mission, state);
  const playByPlay = await generateMissionPlayByPlay(narrativeContext, undefined, state);

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
  const chosen = [...new Set([...initialHeroIds, ...alpha11HeroIds])].filter((heroId) => alpha11HeroIdSet.has(heroId)).slice(0, ACTIVE_TEAM_LIMIT);
  const initialHeroes = normalizeAlpha11Roster(combinedHeroData.map((hero, index) => cloneHero(hero, index, chosen)));
  const activeSize = activeTeamCount(initialHeroes);
  const districts = initializeDistricts();
  const factions = initializeFactions();
  const chains = initializeEventChains();
  const villains = initialVillains();
  const alphaCaseState = initializeAlphaCaseState(villains.filter((villain) => villain.isAlphaActiveVillain));
  const campaignSeed = createCampaignSeed(dispatcher);
  const knownVillainIds = villains
    .filter((villain) => villain.isAlphaActiveVillain || baseVillainIds.has(villain.id) || (villain.visibility ?? "desconhecido") !== "desconhecido")
    .map((villain) => villain.id);
  const activeEvents = generateDailyAlerts({
    day: 1,
    activeTeamSize: activeSize,
    districts,
    factions,
    activeChains: chains.activeEventChains,
    knownVillainIds,
    resolvedIds: [],
  });

  return {
    version: "0.9.5-alpha Missões Cinematográficas",
    version: "1.2.0-alpha Pessoas, Custódia e Inteligência",
    saveVersion: SAVE_VERSION,
    alphaPackageVersion,
    campaignSeed,
    day: 1,
    cityName: "Nova Aurora",
    cityStatus: "em alerta operacional",
    reputation: 62,
    budget: startingBudget,
    activeHeroLimit: ACTIVE_TEAM_LIMIT,
    dispatcher: normalizeDispatcherProgression(dispatcher),
    heroes: initialHeroes,
    memorial: [],
    relationships: buildInitialRelationships(initialHeroes.filter((hero) => hero.isAlphaActive)),
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
    villains,
    knownVillainIds,
    heroPoolVersion: POOL_VERSION_095,
    villainPoolVersion: POOL_VERSION_095,
    recruitmentRotationState: { day: 0, candidateIds: [] },
    balanceConfigVersion,
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
    ...alphaCaseState,
    lastReport: null,
    lastNewspaper: null,
    lastMission: null,
  };
};

const migrateHeroes = (savedHeroes, freshHeroes) => {
  const source = savedHeroes?.length ? mergeById(savedHeroes, freshHeroes) : freshHeroes;
  const chosen = alpha11HeroIds;

  return normalizeAlpha11Roster(source.map((hero, index) => cloneHero(hero, index, chosen))).map((hero) => {
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
  const applicants = mergeById(migrated.applicants ?? [], fresh.applicants).map(normalizeApplicant);
  const villains = normalizeAlphaVillainRoster(
    mergeById(migrated.villains ?? [], fresh.villains)
      .map((villain) => ({ ...villain, visibility: villain.visibility ?? alphaVillainInitialVisibility(villain) }))
      .map(normalizeVillain)
      .map(normalizeVillainLifecycle),
  );
  const knownVillainIds = [
    ...new Set([
      ...(migrated.knownVillainIds ?? migrated.knownVillains ?? []),
      ...villains
        .filter((villain) => villain.isAlphaActiveVillain || baseVillainIds.has(villain.id) || (villain.visibility ?? "desconhecido") !== "desconhecido")
        .map((villain) => villain.id),
    ]),
  ];
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
        knownVillainIds,
        resolvedIds,
      });

  const hydrated = {
    ...fresh,
    ...migrated,
    version: "0.9.5-alpha Missões Cinematográficas",
    saveVersion: SAVE_VERSION,
    version: "1.2.0-alpha Pessoas, Custódia e Inteligência",
    alphaPackageVersion,
    campaignSeed: migrated.campaignSeed ?? fresh.campaignSeed,
    dispatcher: normalizeDispatcherProgression(migrated.dispatcher ?? fresh.dispatcher),
    heroes,
    applicants,
    villains,
    knownVillainIds,
    heroPoolVersion: migrated.heroPoolVersion ?? POOL_VERSION_095,
    villainPoolVersion: migrated.villainPoolVersion ?? POOL_VERSION_095,
    recruitmentRotationState: migrated.recruitmentRotationState ?? { day: 0, candidateIds: [] },
    balanceConfigVersion: migrated.balanceConfigVersion ?? balanceConfigVersion,
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
    relationships: normalizeRelationships(migrated.relationships ?? buildInitialRelationships(heroes.filter((hero) => hero.isAlphaActive)), heroes.filter((hero) => hero.isAlphaActive)),
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

  return ensureAlphaCaseState(hydrated);
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

  const missionReaction = calculateMissionReactions({
    state,
    event,
    team,
    relationships: state.relationships,
    leaderId: team[0]?.id,
  });
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
  const alphaConsequences = alphaOutcomeConsequencesFor(event, rawMission.success);
  const mission = await buildPlayByPlayForMission({
    ...rawMission,
    missionReaction: missionReaction.reactions,
    reputationDelta: rawMission.reputationDelta + districtPublicDelta + (alphaConsequences.reputation ?? 0),
    budgetDelta: rawMission.budgetDelta + (alphaConsequences.budget ?? 0),
    alphaConsequences,
    districtImpact: { districtId: district?.id, districtName: district?.name },
    factionImpact: { factionId: event.factionId, factionName: getFactionById(state.factions, event.factionId)?.name },
  }, state);
  const playByPlayTracking = trackPlayByPlayUse(state, mission);
  const capturedVillainList = mission.capturedVillain ? captureVillain(state.villains, mission.capturedVillain.id, mission) : state.villains;
  const capturedVillainId = mission.capturedVillain?.id;
  const eventVillainId = event.villainId ?? mission.event?.villainId ?? null;
  const nextVillains = capturedVillainList
    .map((villain) => updateVillainAfterMission(villain, mission))
    .map((villain) =>
      villain.id === capturedVillainId
        ? { ...villain, visibility: villain.estadoAtual ?? villain.status ?? "capturado" }
        : villain.id === eventVillainId
          ? {
              ...villain,
              visibility: villain.visibility === "desconhecido" ? "suspeito" : villain.visibility,
              historicoEncontros: [
                ...(villain.historicoEncontros ?? []),
                {
                  day: mission.day,
                  eventTitle: mission.event.titulo,
                  result: mission.outcome,
                  heroes: mission.heroNames,
                  role: "suspeito identificado",
                },
              ].slice(-12),
            }
          : villain,
    );
  const knownVillainIds = eventVillainId || capturedVillainId
    ? [...new Set([...(state.knownVillainIds ?? []), eventVillainId, capturedVillainId].filter(Boolean))]
    : state.knownVillainIds ?? [];
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
  const stateAfterMission = recordLegacyFromMission({
    ...appendAuditEvent(state, missionReaction.event),
    reputation: nextReputation,
    budget: nextBudget,
    heroes: nextHeroes,
    memorial: [...state.memorial, ...mission.deaths],
    villains: nextVillains,
    knownVillainIds,
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
  const stateAfterCases =
    capturedVillainId && alphaVillainIdSet.has(capturedVillainId)
      ? intakeCapturedVillainCase(stateAfterMission, capturedVillainId, mission)
      : ensureAlphaCaseState(stateAfterMission);
  const postMissionTeamScene = generatePostMissionTeamScene(stateAfterCases, mission);
  const nextState = applyPostMissionTeamScene(
    postMissionTeamScene
      ? {
          ...stateAfterCases,
          lastMission: { ...stateAfterCases.lastMission, teamScene: postMissionTeamScene },
          history: stateAfterCases.history.map((entry) => (entry.id === mission.id ? { ...entry, teamScene: postMissionTeamScene } : entry)),
          dailyLog: stateAfterCases.dailyLog.map((entry) => (entry.id === mission.id ? { ...entry, teamScene: postMissionTeamScene } : entry)),
        }
      : stateAfterCases,
    postMissionTeamScene,
    mission,
  );

  return { state: nextState, mission: nextState.lastMission ?? mission };
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
      reputationDelta:
        -Math.max(2, event.nivelRisco * 2) +
        (event.cityModifiers?.reputationFailureModifier ?? 0) +
        (alphaOutcomeConsequencesFor(event, false).reputation ?? 0),
      budgetDelta: -Math.round(event.nivelRisco * 650 + event.dificuldade * 14) + (alphaOutcomeConsequencesFor(event, false).budget ?? 0),
      alphaConsequences: alphaOutcomeConsequencesFor(event, false),
      civiliansSaved: 0,
      materialDamage: event.nivelRisco >= 4 ? "alto" : "médio",
      experienceGain: 0,
      heroUpdates: [],
      missionFacts: [],
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

export const endDay = async (state) => {
  const missed = await Promise.all(state.activeEvents.map((event) => buildMissedMission(event, state.day, state)));
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
  const dailyOperationalGrant = calculateDailyOperationalGrant(state, {
    resolved: fullLog.filter((mission) => mission.success),
    reputation: reputationAfterObjectives,
  });
  const dailyOperationalCosts = calculateDailyCosts(state);
  const economyEntryStamp = Date.now();
  const economyEntries = [
    {
      id: `budget-grant-${state.day}-${economyEntryStamp}`,
      day: state.day,
      type: "income",
      label: "Verba operacional diaria",
      amount: dailyOperationalGrant,
    },
    ...(dailyOperationalCosts.total
      ? [
          {
            id: `budget-costs-${state.day}-${economyEntryStamp}`,
            day: state.day,
            type: "expense",
            label: "Custos operacionais diarios",
            amount: dailyOperationalCosts.total,
          },
        ]
      : []),
  ];
  const budgetFloor = applyBudgetFloorRules(budgetAfterObjectives + dailyOperationalGrant - dailyOperationalCosts.total, state);
  const floorEntries = budgetFloor.floorGrant
    ? [
        {
          id: `budget-floor-${state.day}-${economyEntryStamp}`,
          day: state.day,
          type: "income",
          label: "Fundo emergencial de estabilidade",
          amount: budgetFloor.floorGrant,
        },
      ]
    : [];
  const budgetAfterDailyEconomy = budgetFloor.budget;
  let districtsAfterMissed = state.districts;
  let factionsAfterMissed = state.factions;
  missed.forEach((mission) => {
    districtsAfterMissed = applyMissionResultToDistricts(districtsAfterMissed, mission);
    factionsAfterMissed = applyMissionResultToFactions(factionsAfterMissed, mission);
  });

  const resolvedDistrictIds = [...new Set(state.dailyLog.map((mission) => mission.event.districtId).filter(Boolean))];
  const districtsAfterDecay = applyDailyDistrictDecay(districtsAfterMissed, resolvedDistrictIds);
  const factionTick = applyDailyFactionTick(factionsAfterMissed, districtsAfterDecay, state.day + 1);
  const dayBudgetEntries = [...state.budgetLog, ...budgetEntries, ...objectiveEvaluation.budgetEntries, ...economyEntries, ...floorEntries].filter((entry) => entry.day === state.day);
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
    budget: budgetAfterDailyEconomy,
    dayIncome,
    dayExpenses,
    dailyOperationalGrant,
    dailyOperationalCosts,
    budgetFloorGrant: budgetFloor.floorGrant,
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
      budget: budgetAfterDailyEconomy,
      heroes: restedHeroes,
      districts: districtsAfterSocial,
      factions: factionTick.factions,
      commandObjectives: objectiveEvaluation.objectives,
      commandEvents: state.commandEvents ?? [],
      budgetLog: [...state.budgetLog, ...budgetEntries, ...objectiveEvaluation.budgetEntries, ...economyEntries, ...floorEntries],
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
    knownVillainIds: systemSeed.knownVillainIds ?? [],
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
