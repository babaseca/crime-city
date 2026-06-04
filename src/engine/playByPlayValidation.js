import { staticPlayByPlayData } from "./playByPlaySystem";

const allowedPlaceholders = new Set([
  "district",
  "faction",
  "villain",
  "eventTitle",
  "risk",
  "difficulty",
  "civiliansSaved",
  "collateralDamage",
  "result",
  "combo",
  "dispatcher",
  "timeLimit",
  "teamMorale",
]);

const normalize = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const allItems = (data = staticPlayByPlayData) => [
  ...(data.genericBeats ?? []),
  ...(data.resultBeats ?? []),
  ...(data.districtBeats ?? []),
  ...(data.factionBeats ?? []),
  ...(data.heroRoleBeats ?? []),
  ...(data.comboBeats ?? []),
  ...(data.injuryBeats ?? []),
  ...(data.captureBeats ?? []),
  ...(data.eventVariants ?? []),
];

const itemTexts = (item) =>
  [
    item.text,
    item.summary,
    ...(item.beats ?? []).map((beat) => beat.text),
    ...(item.seeds?.headlineSeeds ?? []),
    ...(item.seeds?.socialSeeds ?? []),
    ...(item.seeds?.legacySeeds ?? []),
  ].filter(Boolean);
const itemTags = (item) => [...(item.missionTags ?? []), ...(item.archetypes ?? [])];

const itemMatchesEvent = (item, event) => {
  if (item.eventId && item.eventId !== event.id) return false;
  const tags = itemTags(item);
  return !tags.length || tags.includes("*") || tags.some((tag) => event.tags?.includes(tag));
};

const beatMatchesEvent = (beat, event, phase) => {
  if (normalize(beat.phase) !== normalize(phase)) return false;
  return itemMatchesEvent(beat, event);
};

export function ensureMinimumPlayByPlayVariety(event, data = staticPlayByPlayData) {
  const reusableBeats = allItems(data).filter((item) => !item.beats);
  const variants = (data.eventVariants ?? []).filter((variant) => itemMatchesEvent(variant, event)).length;
  const chamado = reusableBeats.filter((beat) => beatMatchesEvent(beat, event, "chamado")).length;
  const chegada = reusableBeats.filter((beat) => beatMatchesEvent(beat, event, "chegada")).length;
  const complicacao = reusableBeats.filter((beat) => beatMatchesEvent(beat, event, "complicacao")).length;
  const resolucao = reusableBeats.filter((beat) => beatMatchesEvent(beat, event, "resolucao")).length;
  const consequencia = reusableBeats.filter((beat) => beatMatchesEvent(beat, event, "consequencia")).length;
  const conservativeCombinations = Math.min(chamado, 3) * Math.min(chegada, 3) * Math.min(complicacao, 3) * Math.min(resolucao, 3) * Math.min(consequencia, 3);
  const totalRoutes = variants + conservativeCombinations;

  return {
    eventId: event.id,
    title: event.titulo,
    variants,
    phaseOptions: { chamado, chegada, complicacao, resolucao, consequencia },
    totalRoutes,
    passes: totalRoutes >= 15,
  };
}

export function validatePlayByPlayCoverage(events = [], playByPlayData = staticPlayByPlayData) {
  const coverage = events.map((event) => ensureMinimumPlayByPlayVariety(event, playByPlayData));
  const eventsBelowTarget = coverage.filter((entry) => !entry.passes);
  const allTags = [...new Set(events.flatMap((event) => event.tags ?? []))];
  const allItemsForTags = allItems(playByPlayData);
  const tagsWithoutEnoughBeats = allTags
    .map((tag) => ({
      tag,
      beatCount: allItemsForTags.filter((item) => itemTags(item).includes(tag)).length,
    }))
    .filter((entry) => entry.beatCount < 3);

  return {
    totalEvents: events.length,
    eventsWith15PlusRoutes: coverage.filter((entry) => entry.passes).length,
    eventsBelowTarget,
    tagsWithoutEnoughBeats,
    districtsWithoutBeats: [],
    factionsWithoutBeats: [],
  };
}

export function validatePlaceholders(playByPlayData = staticPlayByPlayData) {
  const invalidPlaceholders = [];
  allItems(playByPlayData).forEach((item) => {
    itemTexts(item).forEach((text) => {
      const matches = String(text).matchAll(/\{([^}]+)\}/g);
      [...matches].forEach((match) => {
        const token = match[1];
        const validHero = /^hero:[0-2]$/.test(token);
        if (!validHero && !allowedPlaceholders.has(token)) {
          invalidPlaceholders.push({ id: item.id, placeholder: token, text });
        }
      });
    });
  });
  return invalidPlaceholders;
}

export function validateSoloCompatibility(playByPlayData = staticPlayByPlayData) {
  return allItems(playByPlayData)
    .filter((item) => {
      const minHeroes = item.minHeroes ?? 1;
      const text = itemTexts(item).join(" ");
      return minHeroes < 2 && /\{hero:[12]\}/.test(text);
    })
    .map((item) => ({ id: item.id, minHeroes: item.minHeroes ?? 1 }));
}

export function validateCooldowns(playByPlayData = staticPlayByPlayData) {
  return allItems(playByPlayData)
    .filter((item) => typeof item.cooldownDays !== "number")
    .map((item) => ({ id: item.id, type: item.beats ? "variant" : "beat" }));
}

export function generatePlayByPlayCoverageReport(events = [], playByPlayData = staticPlayByPlayData) {
  const coverage = validatePlayByPlayCoverage(events, playByPlayData);
  return {
    ...coverage,
    invalidPlaceholders: validatePlaceholders(playByPlayData),
    soloIncompatibleBeats: validateSoloCompatibility(playByPlayData),
    missingCooldowns: validateCooldowns(playByPlayData),
  };
}
