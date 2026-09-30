import playByPlayIndex from "../data/playByPlay/playByPlayIndex.json";
import genericBeats from "../data/playByPlay/genericBeats.json";
import resultBeats from "../data/playByPlay/resultBeats.json";
import districtBeats from "../data/playByPlay/districtBeats.json";
import factionBeats from "../data/playByPlay/factionBeats.json";
import heroRoleBeats from "../data/playByPlay/heroRoleBeats.json";
import comboBeats from "../data/playByPlay/comboBeats.json";
import injuryBeats from "../data/playByPlay/injuryBeats.json";
import captureBeats from "../data/playByPlay/captureBeats.json";
import eventVariantsPart001 from "../data/playByPlay/eventVariants/part-001.json";
import eventVariantsPart002 from "../data/playByPlay/eventVariants/part-002.json";
import eventVariantsPart003 from "../data/playByPlay/eventVariants/part-003.json";
import { normalizeDisplayText } from "../utils/formatters";

const phaseIcons = {
  chamado: "radio",
  despacho: "send",
  chegada: "map-pin",
  primeira_acao: "zap",
  acao: "zap",
  complicacao: "alert-triangle",
  sinergia: "users",
  virada: "activity",
  resolucao: "check-circle",
  consequencia: "newspaper",
  faccao: "shield-alert",
  "facção": "shield-alert",
  vilao: "skull",
  combo: "sparkles",
  ferimento: "heart-pulse",
  captura: "lock",
  morte: "flower",
  dispatcher: "radio",
  bairro: "map-pin",
};

const fallbackValues = {
  faction: "a ameaça local",
  villain: "o suspeito",
  district: "a área da ocorrência",
  combo: "a manobra combinada",
  dispatcher: "a Central",
};

export const staticPlayByPlayData = {
  index: playByPlayIndex,
  genericBeats,
  resultBeats,
  districtBeats,
  factionBeats,
  heroRoleBeats,
  comboBeats,
  injuryBeats,
  captureBeats,
  eventVariants: [...eventVariantsPart001, ...eventVariantsPart002, ...eventVariantsPart003],
};

const alpha100EventVariantLoaders = import.meta.glob("../data/playByPlay/alpha100/part-*.json");
const alpha100VariantCache = new Map();

const alpha100PartForEventId = (eventId = "") => {
  const match = String(eventId).match(/alpha100-evt-(\d+)/);
  if (!match) return null;
  const eventNumber = Number(match[1]);
  if (!Number.isFinite(eventNumber)) return null;
  return String(Math.floor((eventNumber - 1) / 100) + 1).padStart(3, "0");
};

const loadAlpha100EventVariants = async (eventId) => {
  const part = alpha100PartForEventId(eventId);
  if (!part) return [];
  if (alpha100VariantCache.has(part)) return alpha100VariantCache.get(part);
  const loader = alpha100EventVariantLoaders[`../data/playByPlay/alpha100/part-${part}.json`];
  if (!loader) return [];
  const module = await loader();
  const variants = module.default ?? module;
  alpha100VariantCache.set(part, variants);
  return variants;
};

const playByPlayDataForContext = async (context, data = null) => {
  if (data) return data;
  const alpha100Variants = await loadAlpha100EventVariants(context.eventId);
  if (!alpha100Variants.length) return staticPlayByPlayData;
  return {
    ...staticPlayByPlayData,
    eventVariants: [...staticPlayByPlayData.eventVariants, ...alpha100Variants],
  };
};

const stableHash = (value = "") => {
  let hash = 0;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
};

const normalizeKey = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const titleCase = (value = "") =>
  normalizeDisplayText(String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()));

const publicText = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  return normalizeDisplayText(String(value).includes("_") || String(value).includes("-") ? titleCase(value) : String(value));
};

const itemMissionTags = (item) => [...(item.missionTags ?? []), ...(item.archetypes ?? [])];

const listIncludesAny = (requirements = [], values = [], allowAny = true) => {
  if (!requirements.length) return true;
  if (allowAny && requirements.includes("any")) return true;
  if (requirements.includes("*")) return true;
  return requirements.some((requirement) => values.includes(requirement));
};

const resultMatches = (item, context) => {
  const resultTypes = item.resultTypes ?? ["any"];
  return listIncludesAny(resultTypes, context.resultTypes ?? [context.resultType]);
};

const tagMatches = (item, context) => {
  const tags = itemMissionTags(item);
  if (!tags.length || tags.includes("*")) return true;
  return tags.some((tag) => context.missionTags?.includes(tag));
};

const roleMatches = (item, context) => {
  const requiredRoles = item.requiredHeroRoles ?? [];
  if (!requiredRoles.length) return true;
  const normalizedRoles = (context.heroRoles ?? []).map(normalizeKey);
  const normalizedTags = [...(context.missionTags ?? []), ...(context.requiredAttributes ?? [])].map(normalizeKey);
  return requiredRoles.some((role) => {
    const normalized = normalizeKey(role);
    return normalizedRoles.some((heroRole) => heroRole.includes(normalized)) || normalizedTags.includes(normalized);
  });
};

const districtMatches = (item, context) => {
  const districtIds = item.districtIds ?? [];
  return !districtIds.length || districtIds.includes(context.districtId);
};

const factionMatches = (item, context) => {
  const factionIds = item.factionIds ?? [];
  return !factionIds.length || factionIds.includes(context.factionId);
};

const villainMatches = (item, context) => {
  const villainIds = item.villainIds ?? [];
  return !villainIds.length || villainIds.includes(context.villainId);
};

const heroCountMatches = (item, context) => {
  const minHeroes = item.minHeroes ?? 1;
  const maxHeroes = item.maxHeroes ?? 3;
  return context.heroCount >= minHeroes && context.heroCount <= maxHeroes;
};

export const getRequiredHeroIndexesFromText = (text = "") =>
  [...String(text).matchAll(/\{hero:(\d+)\}/g)].map((match) => Number(match[1]));

const itemTextBlocks = (item = {}) => [
  item.text,
  item.summary,
  ...(item.beats ?? []).map((beat) => beat.text),
  ...((item.seeds?.headlineSeeds ?? [])),
  ...((item.seeds?.socialSeeds ?? [])),
  ...((item.seeds?.legacySeeds ?? [])),
];

const optionalHeroCountMatches = (item = {}, heroCount = 0) => {
  const optional = item.optionalWhen ?? {};
  if (optional.minHeroes && heroCount < optional.minHeroes) return false;
  if (optional.maxHeroes && heroCount > optional.maxHeroes) return false;
  return true;
};

const itemTextBlocksForHeroCount = (item = {}, heroCount = 0) => [
  item.text,
  item.summary,
  ...(item.beats ?? [])
    .filter((beat) => optionalHeroCountMatches(beat, heroCount))
    .map((beat) => beat.text),
  ...((item.seeds?.headlineSeeds ?? [])),
  ...((item.seeds?.socialSeeds ?? [])),
  ...((item.seeds?.legacySeeds ?? [])),
];

export const beatCompatibleWithHeroCount = (beat, heroCount = 0) =>
  optionalHeroCountMatches(beat, heroCount) &&
  getRequiredHeroIndexesFromText(beat?.text ?? "").every((index) => index < heroCount);

export const variantCompatibleWithHeroCount = (variant, heroCount = 0) =>
  itemTextBlocksForHeroCount(variant, heroCount).every((text) =>
    getRequiredHeroIndexesFromText(text ?? "").every((index) => index < heroCount),
  );

const requiresMatches = (requires = {}, context) => {
  if (requires.capture && !context.captures?.length) return false;
  if (requires.injury && !context.injuries?.length) return false;
  if (requires.death && !context.deaths?.length) return false;
  if (requires.combo && !context.activeCombos?.length) return false;
  if (requires.faction && !context.factionId) return false;
  if (requires.villain && !context.villainName) return false;
  if (requires.success === true && !context.success) return false;
  if (requires.failure === true && context.success) return false;
  if (requires.minRisk && context.risk < requires.minRisk) return false;
  if (requires.maxRisk && context.risk > requires.maxRisk) return false;
  if (requires.relationship && requires.relationship !== context.relationshipTone) return false;
  return true;
};

const isCompatible = (item, context, recentPlayByPlay = []) =>
  resultMatches(item, context) &&
  tagMatches(item, context) &&
  roleMatches(item, context) &&
  districtMatches(item, context) &&
  factionMatches(item, context) &&
  villainMatches(item, context) &&
  heroCountMatches(item, context) &&
  variantCompatibleWithHeroCount(item, context.heroCount) &&
  requiresMatches(item.requires ?? {}, context) &&
  !isPlayByPlayOnCooldown(item.id, recentPlayByPlay, context.day, item.cooldownDays ?? 0);

const recentTonePenalty = (tone, recentPlayByPlay = [], day = 1) =>
  recentPlayByPlay.some((entry) => entry.tone === tone && day - entry.day <= 1) ? 30 : 0;

const recentFirstLinePenalty = (text, recentPlayByPlay = []) => {
  const firstLineHash = stableHash(String(text ?? "").slice(0, 120));
  return recentPlayByPlay.some((entry) => entry.firstLineHash === firstLineHash) ? 50 : 0;
};

const bestOfTopFive = (ranked, context) => {
  if (!ranked.length) return null;
  const pool = ranked.slice(0, 5);
  const seed = stableHash(`${context.eventId}:${context.day}:${context.heroCount}:${ranked[0].score}`);
  const index = Number.parseInt(seed.slice(-2), 36) % pool.length;
  return pool[index]?.item ?? null;
};

const allReusableBeats = (data = staticPlayByPlayData) => [
  ...(data.genericBeats ?? []),
  ...(data.resultBeats ?? []),
  ...(data.districtBeats ?? []),
  ...(data.factionBeats ?? []),
  ...(data.heroRoleBeats ?? []),
  ...(data.comboBeats ?? []),
  ...(data.injuryBeats ?? []),
  ...(data.captureBeats ?? []),
];

const scoreReusableBeat = (beat, context, recentPlayByPlay = []) => {
  if (!isCompatible(beat, context, recentPlayByPlay)) return -999;
  let score = beat.priority ?? 10;
  score += itemMissionTags(beat).filter((tag) => context.missionTags?.includes(tag)).length * 5;
  if ((beat.resultTypes ?? []).some((type) => context.resultTypes?.includes(type))) score += 16;
  if ((beat.districtIds ?? []).includes(context.districtId)) score += 18;
  if ((beat.factionIds ?? []).includes(context.factionId)) score += 18;
  if (beat.requires?.combo && context.activeCombos?.length) score += 20;
  if (beat.requires?.capture && context.captures?.length) score += 20;
  if (beat.requires?.injury && context.injuries?.length) score += 20;
  if (beat.requires?.death && context.deaths?.length) score += 28;
  score -= recentTonePenalty(beat.tone, recentPlayByPlay, context.day);
  score -= recentFirstLinePenalty(beat.text, recentPlayByPlay);
  return score;
};

const chooseBeatForPhase = (phase, context, data, recentPlayByPlay) => {
  const phaseKey = normalizeKey(phase);
  const ranked = allReusableBeats(data)
    .filter((beat) => normalizeKey(beat.phase) === phaseKey)
    .map((beat) => ({ item: beat, score: scoreReusableBeat(beat, context, recentPlayByPlay) }))
    .filter((entry) => entry.score > -999)
    .sort((first, second) => second.score - first.score);

  return bestOfTopFive(ranked, context);
};

const timeForIndex = (index, total, context) => {
  const maxMinutes = Number.parseInt(String(context.timeLimit ?? "").match(/\d+/)?.[0] ?? "45", 10);
  const bounded = Number.isFinite(maxMinutes) ? Math.min(180, Math.max(20, maxMinutes)) : 45;
  const minute = Math.round((bounded * index) / Math.max(1, total - 1));
  return `${String(minute).padStart(2, "0")}:${index % 2 ? "20" : "00"}`;
};

const normalizeBeat = (beat, index, total, context) => ({
  id: beat.id ?? `generated-beat-${context.eventId}-${index}`,
  phase: beat.phase,
  time: beat.time ?? timeForIndex(index, total, context),
  icon: beat.icon ?? phaseIcons[normalizeKey(beat.phase)] ?? "activity",
  text: normalizeDisplayText(renderPlayByPlayText(beat.text, context)),
});

const renderBeats = (beats, context) =>
  beats
    .filter((beat) => beatCompatibleWithHeroCount(beat, context.heroCount))
    .map((beat, index, filteredBeats) => normalizeBeat(beat, index, filteredBeats.length, context));

const alpha11ContextBeat = (context) => {
  const heroes = context.selectedHeroes ?? [];
  if (heroes.length < 2) return null;
  const facts = new Set((context.missionFacts ?? []).map((fact) => fact.type));
  const highCivil = heroes.find((hero) => (hero.moralProfile?.civilianPriority ?? 0) >= 90);
  const highCollateral = heroes.find((hero) => (hero.moralProfile?.collateralTolerance ?? 0) >= 55);
  const planner = heroes.find((hero) => (hero.atributos?.investigacao ?? 0) >= 8);
  const fastMover = heroes.find((hero) => (hero.atributos?.mobilidade ?? 0) >= 8);
  const publicVoice = heroes.find((hero) => (hero.moralProfile?.publicExposureComfort ?? 0) >= 75);
  const protocolBreaker = heroes.find((hero) => (hero.moralProfile?.authorityRespect ?? 50) <= 40);

  if (highCivil && highCollateral && (facts.has("infrastructure_destroyed") || facts.has("neighborhood_blackout"))) {
    return {
      id: `alpha11-moral-collision-${context.eventId}`,
      phase: "complicacao",
      time: "18:40",
      icon: "alert-triangle",
      text: `${highCivil.codinome} pediu mais trinta segundos para retirar os últimos civis. ${highCollateral.codinome} respondeu que a estrutura não aguentaria tanto. Pela primeira vez naquela noite, nenhum dos dois esperou que a Central resolvesse o impasse por eles.`,
    };
  }

  if (planner && fastMover && facts.has("mission_success_clean")) {
    return {
      id: `alpha11-clean-sync-${context.eventId}`,
      phase: "sinergia",
      time: "16:20",
      icon: "users",
      text: `${planner.codinome} recalculou a rota antes que ${fastMover.codinome} terminasse a travessia. Não houve discurso, só a eficiência de duas pessoas que já sabiam como a outra pensava.`,
    };
  }

  if (publicVoice && protocolBreaker && facts.has("hero_disobeyed_order")) {
    return {
      id: `alpha11-public-friction-${context.eventId}`,
      phase: "consequencia",
      time: "fim",
      icon: "radio",
      text: `${publicVoice.codinome} manteve o canal público limpo enquanto ${protocolBreaker.codinome} cortava caminho pelo risco. A missão avançou, mas a imagem da Central ficou pendurada entre coragem e indisciplina.`,
    };
  }

  return null;
};

const withAlpha11ContextBeat = (playByPlay, context) => {
  const beat = alpha11ContextBeat(context);
  if (!playByPlay || !beat || (playByPlay.beats ?? []).some((existing) => existing.id === beat.id)) return playByPlay;
  const beats = playByPlay.beats ?? [];
  const insertAt = Math.max(1, beats.length - 1);
  return {
    ...playByPlay,
    beats: [...beats.slice(0, insertAt), beat, ...beats.slice(insertAt)],
    usedVariantIds: [...(playByPlay.usedVariantIds ?? []), beat.id],
  };
};

const summaryFromContext = (context) => {
  if (context.heroCount === 0) return `Sem equipe designada, ${context.eventTitle} evoluiu em ${context.districtName} até virar custo público.`;
  const lead = context.selectedHeroes?.[0]?.codinome ?? "A equipe";
  if (context.deaths?.length) return `${lead} encerrou a ocorrência em ${context.districtName}, mas a missão entrou para a memória da Central.`;
  if (context.captures?.length) return `${lead} conteve a crise e trouxe ${context.villainName ?? "um suspeito"} para custódia.`;
  if (context.success) return `${lead} estabilizou ${context.eventTitle} antes que ${context.districtName} perdesse o controle da cena.`;
  return `${lead} chegou a conter parte de ${context.eventTitle}, mas a cidade ainda absorveu o impacto.`;
};

const seedsFromContext = (context) => {
  const hero = context.selectedHeroes?.[0]?.codinome ?? "Equipe da Central";
  const headlineSeeds = [
    context.success
      ? `${hero} segura ${context.eventTitle} em ${context.districtName}`
      : `${context.districtName} cobra respostas após ${context.eventTitle}`,
  ];
  const socialSeeds = [
    context.success
      ? `Se ${hero} não abre aquela cena em ${context.districtName}, a rua ainda estava travada.`
      : `A gente ouviu sirene, viu pressa e ainda ficou sem resposta em ${context.districtName}.`,
  ];
  const legacySeeds = [];
  if (context.deaths?.length) legacySeeds.push(`${context.deaths[0].codinome} virou referência permanente após ${context.eventTitle}.`);
  if (context.captures?.length) legacySeeds.push(`${context.villainName} foi capturado depois de deixar rastros em ${context.districtName}.`);
  if (context.success && context.civiliansSaved >= 35) legacySeeds.push(`${hero} salvou ${context.civiliansSaved} civis em ${context.districtName}.`);
  return { headlineSeeds, socialSeeds, legacySeeds };
};

const renderSeeds = (seeds = {}, context) => ({
  headlineSeeds: (seeds.headlineSeeds ?? []).map((seed) => renderPlayByPlayText(seed, context)),
  socialSeeds: (seeds.socialSeeds ?? []).map((seed) => renderPlayByPlayText(seed, context)),
  legacySeeds: (seeds.legacySeeds ?? []).map((seed) => renderPlayByPlayText(seed, context)),
});

const mergeSeeds = (baseSeeds = {}, extraSeeds = {}) => ({
  headlineSeeds: [...(baseSeeds.headlineSeeds ?? []), ...(extraSeeds.headlineSeeds ?? [])],
  socialSeeds: [...(baseSeeds.socialSeeds ?? []), ...(extraSeeds.socialSeeds ?? [])],
  legacySeeds: [...(baseSeeds.legacySeeds ?? []), ...(extraSeeds.legacySeeds ?? [])],
});

export function renderPlayByPlayText(text, context) {
  const heroes = context.selectedHeroes ?? [];
  const comboName = context.activeCombos?.[0]?.name;
  const replacements = {
    district: context.districtName ?? fallbackValues.district,
    faction: context.factionName ?? fallbackValues.faction,
    villain: context.villainName ?? fallbackValues.villain,
    eventTitle: context.eventTitle ?? "a ocorrência",
    risk: publicText(context.risk, "não informado"),
    difficulty: publicText(context.difficulty, "não informada"),
    civiliansSaved: publicText(context.civiliansSaved, "0"),
    collateralDamage: publicText(context.collateralDamage, "não informado"),
    result: context.resultLabel ?? titleCase(context.resultType ?? "resultado operacional"),
    combo: comboName ?? fallbackValues.combo,
    dispatcher: context.dispatcherName ?? fallbackValues.dispatcher,
    timeLimit: context.timeLimit ?? "o limite operacional",
    teamMorale: publicText(context.teamMorale, "estável"),
  };

  return normalizeDisplayText(String(text ?? "")
    .replace(/\{hero:(\d+)\}/g, (_, rawIndex) => {
      const hero = heroes[Number(rawIndex)];
      return hero?.codinome ?? (heroes.length ? "a equipe" : "a Central");
    })
    .replace(/\{([a-zA-Z]+)\}/g, (_, key) => replacements[key] ?? fallbackValues[key] ?? "o relatório")
    .replace(/\b(undefined|null)\b/gi, "não informado"));
}

export function isPlayByPlayOnCooldown(id, recentPlayByPlay = [], currentDay = 1, cooldownDays = 0) {
  if (!id || cooldownDays <= 0) return false;
  const recent = recentPlayByPlay.find((entry) => entry.id === id);
  return Boolean(recent && currentDay - recent.day < cooldownDays);
}

export function getEligiblePlayByPlayVariants(context, data = staticPlayByPlayData, recentPlayByPlay = []) {
  return (data.eventVariants ?? []).filter((variant) => {
    if (variant.eventId && variant.eventId !== context.eventId) return false;
    return isCompatible(variant, context, recentPlayByPlay);
  });
}

export function scorePlayByPlayVariant(variant, context, recentPlayByPlay = []) {
  if (!isCompatible(variant, context, recentPlayByPlay)) return -999;

  let score = variant.priority ?? 10;
  if (variant.eventId === context.eventId) score += 100;
  if ((variant.resultTypes ?? []).some((type) => context.resultTypes?.includes(type))) score += 35;
  if ((variant.districtIds ?? []).includes(context.districtId)) score += 25;
  if ((variant.factionIds ?? []).includes(context.factionId)) score += 25;
  if ((variant.villainIds ?? []).includes(context.villainId)) score += 35;
  score += itemMissionTags(variant).filter((tag) => context.missionTags?.includes(tag)).length * 5;
  if (heroCountMatches(variant, context)) score += 15;
  if (variant.requires?.combo && context.activeCombos?.length) score += 20;
  if (variant.requires?.capture && context.captures?.length) score += 20;
  if (variant.requires?.injury && context.injuries?.length) score += 20;
  if (variant.requires?.death && context.deaths?.length) score += 20;
  score -= recentTonePenalty(variant.tone, recentPlayByPlay, context.day);
  score -= recentFirstLinePenalty(variant.beats?.[0]?.text, recentPlayByPlay);
  return score;
}

export function assemblePlayByPlayFromBeats(context, data = staticPlayByPlayData, recentPlayByPlay = []) {
  const phases = ["chamado", "despacho", "chegada", "primeira_acao", "complicacao"];

  if (context.factionId) phases.push("facção");
  if (context.activeCombos?.length) phases.push("combo");
  else if (context.heroCount > 1) phases.push("sinergia");
  phases.push(context.success ? "virada" : "consequencia");
  if (context.captures?.length) phases.push("captura");
  if (context.injuries?.length) phases.push("ferimento");
  if (context.deaths?.length) phases.push("morte");
  phases.push("resolucao", "consequencia");

  const targetCount = context.risk >= 4 || context.deaths?.length ? 9 : context.risk >= 3 ? 7 : 6;
  const chosen = phases
    .map((phase) => chooseBeatForPhase(phase, context, data, recentPlayByPlay))
    .filter(Boolean)
    .slice(0, Math.max(5, targetCount));

  if (chosen.length < 5) return null;

  return {
    id: `assembled-pbp-${context.eventId}-${context.day}-${stableHash(chosen.map((beat) => beat.id).join(":"))}`,
    source: "assembled",
    title: "Como aconteceu",
    tone: chosen[0]?.tone ?? "operacional",
    summary: summaryFromContext(context),
    beats: renderBeats(chosen, context),
    usedVariantIds: chosen.map((beat) => beat.id),
    tags: [...new Set([...(context.missionTags ?? []), "montado"])],
    seeds: seedsFromContext(context),
  };
}

export function buildFallbackPlayByPlay(context) {
  const lead = context.selectedHeroes?.[0]?.codinome ?? (context.heroCount === 0 ? "A Central" : "A equipe");
  const beats = [
    {
      id: `fallback-${context.eventId}-chamado`,
      phase: "chamado",
      time: "00:00",
      text: "O alerta sobre {eventTitle} entrou no painel da Central com risco {risk}.",
    },
    {
      id: `fallback-${context.eventId}-chegada`,
      phase: "chegada",
      time: "03:00",
      text:
        context.heroCount === 0
          ? "O chamado ficou sem equipe designada enquanto {district} seguia acumulando risco."
          : `${lead} chegou em {district} e encontrou a situação pior do que o primeiro chamado indicava.`,
    },
    {
      id: `fallback-${context.eventId}-acao`,
      phase: "primeira_acao",
      time: "08:00",
      text: "A prioridade foi estabilizar civis e impedir que a ocorrência se espalhasse.",
    },
    context.factionId
      ? {
          id: `fallback-${context.eventId}-faccao`,
          phase: "facção",
          time: "13:00",
          text: "Sinais no local indicaram possível ligação com {faction}.",
        }
      : null,
    {
      id: `fallback-${context.eventId}-resolucao`,
      phase: "resolucao",
      time: "fim",
      text: "A missão terminou como {result}, com dano {collateralDamage} e {civiliansSaved} civis salvos.",
    },
    {
      id: `fallback-${context.eventId}-consequencia`,
      phase: "consequencia",
      time: "fim",
      text: "O bairro de {district} ficou com a cena marcada no relatório do dia.",
    },
  ].filter(Boolean);

  return {
    id: `fallback-pbp-${context.eventId}-${Date.now()}`,
    source: "fallback",
    title: "Como aconteceu",
    tone: "operacional",
    summary: summaryFromContext(context),
    beats: renderBeats(beats, context),
    usedVariantIds: beats.map((beat) => beat.id),
    tags: [...new Set([...(context.missionTags ?? []), "fallback"])],
    seeds: seedsFromContext(context),
  };
}

export function formatPlayByPlayForReport(playByPlay) {
  if (!playByPlay) return null;
  return {
    ...playByPlay,
    title: playByPlay.title ?? "Como aconteceu",
    summary: playByPlay.summary ?? "",
    beats: (playByPlay.beats ?? []).map((beat, index) => ({
      id: beat.id ?? `beat-${index}`,
      phase: beat.phase ?? "registro",
      time: beat.time ?? "",
      icon: beat.icon ?? phaseIcons[normalizeKey(beat.phase)] ?? "activity",
      text: beat.text ? normalizeDisplayText(beat.text) : "Registro operacional indisponível.",
    })),
    seeds: {
      headlineSeeds: playByPlay.seeds?.headlineSeeds ?? [],
      socialSeeds: playByPlay.seeds?.socialSeeds ?? [],
      legacySeeds: playByPlay.seeds?.legacySeeds ?? [],
    },
  };
}

export function ensureAllSelectedHeroesRepresented(playByPlay, context) {
  const heroes = context.selectedHeroes ?? [];
  if (!playByPlay || heroes.length < 3) return playByPlay;

  const storyText = [
    playByPlay.summary,
    ...(playByPlay.beats ?? []).map((beat) => beat.text),
    ...(playByPlay.seeds?.headlineSeeds ?? []),
    ...(playByPlay.seeds?.socialSeeds ?? []),
    ...(playByPlay.seeds?.legacySeeds ?? []),
  ].join(" ");
  const missingHeroes = heroes.filter((hero) => hero?.codinome && !storyText.includes(hero.codinome));
  if (!missingHeroes.length) return playByPlay;

  const contributionBeats = missingHeroes.map((hero, index) => ({
    id: `hero-contribution-${context.eventId}-${hero.id}`,
    phase: "sinergia",
    time: `${String(12 + index * 3).padStart(2, "0")}:40`,
    icon: "users",
    text: `${hero.codinome} assumiu um eixo paralelo da ocorrência e manteve a equipe inteira sincronizada.`,
  }));
  const beats = playByPlay.beats ?? [];
  const insertAt = Math.max(1, beats.length - 1);

  return {
    ...playByPlay,
    beats: [...beats.slice(0, insertAt), ...contributionBeats, ...beats.slice(insertAt)],
    usedVariantIds: [...(playByPlay.usedVariantIds ?? []), ...contributionBeats.map((beat) => beat.id)],
  };
}

export async function generateMissionPlayByPlay(context, playByPlayData = null, gameState = {}) {
  const resolvedPlayByPlayData = await playByPlayDataForContext(context, playByPlayData);
  const recentPlayByPlay = gameState.recentPlayByPlay ?? [];
  const rankedVariants = getEligiblePlayByPlayVariants(context, resolvedPlayByPlayData, recentPlayByPlay)
    .map((variant) => ({ item: variant, score: scorePlayByPlayVariant(variant, context, recentPlayByPlay) }))
    .filter((entry) => entry.score > -999)
    .sort((first, second) => second.score - first.score);
  const variant = bestOfTopFive(rankedVariants, context);

  if (variant) {
    const generated = {
      id: `generated-pbp-${variant.id}-${context.day}`,
      source: "event_variant",
      title: "Como aconteceu",
      tone: variant.tone ?? "operacional",
      summary: renderPlayByPlayText(variant.summary ?? summaryFromContext(context), context),
      beats: renderBeats(variant.beats ?? [], context),
      usedVariantIds: [variant.id],
      tags: [...new Set([...(variant.missionTags ?? []), ...(context.missionTags ?? [])])],
      seeds: renderSeeds(mergeSeeds(seedsFromContext(context), variant.seeds), context),
    };

    return formatPlayByPlayForReport(ensureAllSelectedHeroesRepresented(withAlpha11ContextBeat(generated, context), context));
  }

  const assembled = assemblePlayByPlayFromBeats(context, resolvedPlayByPlayData, recentPlayByPlay);
  if (assembled) return formatPlayByPlayForReport(ensureAllSelectedHeroesRepresented(withAlpha11ContextBeat(assembled, context), context));

  return formatPlayByPlayForReport(ensureAllSelectedHeroesRepresented(withAlpha11ContextBeat(buildFallbackPlayByPlay(context), context), context));
}

export function rememberUsedPlayByPlay(usedIds = [], gameState, meta = {}) {
  const ids = usedIds.length ? usedIds : [meta.id].filter(Boolean);
  const firstLine = meta.firstLine ?? "";
  const entries = ids.map((id) => ({
    id,
    eventId: meta.eventId,
    day: meta.day ?? gameState?.day ?? 1,
    tone: meta.tone ?? "operacional",
    firstLineHash: stableHash(firstLine.slice(0, 120)),
  }));

  return [...entries, ...(gameState?.recentPlayByPlay ?? [])].slice(0, 100);
}




