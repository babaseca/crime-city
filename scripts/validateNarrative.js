import { readdir, readFile } from "node:fs/promises";
import { events } from "../src/data/events.js";

const playByPlayRoot = new URL("../src/data/playByPlay/", import.meta.url);
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

const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, playByPlayRoot), "utf8"));

const normalize = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const itemTags = (item) => [...(item.missionTags ?? []), ...(item.archetypes ?? [])];

const itemTexts = (item) =>
  [
    item.text,
    item.summary,
    ...(item.beats ?? []).map((beat) => beat.text),
    ...(item.seeds?.headlineSeeds ?? []),
    ...(item.seeds?.socialSeeds ?? []),
    ...(item.seeds?.legacySeeds ?? []),
  ].filter(Boolean);

const itemMatchesEvent = (item, event) => {
  if (item.eventId && item.eventId !== event.id) return false;
  const tags = itemTags(item);
  return !tags.length || tags.includes("*") || tags.some((tag) => event.tags?.includes(tag));
};

const beatMatchesEvent = (beat, event, phase) => {
  if (normalize(beat.phase) !== normalize(phase)) return false;
  return itemMatchesEvent(beat, event);
};

const loadPlayByPlayData = async () => {
  const eventVariantDir = new URL("eventVariants/", playByPlayRoot);
  const eventVariantFiles = (await readdir(eventVariantDir)).filter((name) => name.endsWith(".json"));
  const eventVariants = (await Promise.all(eventVariantFiles.map((name) => readJson(`eventVariants/${name}`)))).flat();

  return {
    genericBeats: await readJson("genericBeats.json"),
    resultBeats: await readJson("resultBeats.json"),
    districtBeats: await readJson("districtBeats.json"),
    factionBeats: await readJson("factionBeats.json"),
    heroRoleBeats: await readJson("heroRoleBeats.json"),
    comboBeats: await readJson("comboBeats.json"),
    injuryBeats: await readJson("injuryBeats.json"),
    captureBeats: await readJson("captureBeats.json"),
    eventVariants,
  };
};

const allItems = (data) => [
  ...data.genericBeats,
  ...data.resultBeats,
  ...data.districtBeats,
  ...data.factionBeats,
  ...data.heroRoleBeats,
  ...data.comboBeats,
  ...data.injuryBeats,
  ...data.captureBeats,
  ...data.eventVariants,
];

const routeCountForEvent = (event, data) => {
  const reusableBeats = allItems(data).filter((item) => !item.beats);
  const variants = data.eventVariants.filter((variant) => itemMatchesEvent(variant, event)).length;
  const chamado = reusableBeats.filter((beat) => beatMatchesEvent(beat, event, "chamado")).length;
  const chegada = reusableBeats.filter((beat) => beatMatchesEvent(beat, event, "chegada")).length;
  const complicacao = reusableBeats.filter((beat) => beatMatchesEvent(beat, event, "complicacao")).length;
  const resolucao = reusableBeats.filter((beat) => beatMatchesEvent(beat, event, "resolucao")).length;
  const consequencia = reusableBeats.filter((beat) => beatMatchesEvent(beat, event, "consequencia")).length;
  const totalRoutes = variants + Math.min(chamado, 3) * Math.min(chegada, 3) * Math.min(complicacao, 3) * Math.min(resolucao, 3) * Math.min(consequencia, 3);
  return { eventId: event.id, title: event.titulo, variants, phaseOptions: { chamado, chegada, complicacao, resolucao, consequencia }, totalRoutes, passes: totalRoutes >= 15 };
};

const validatePlaceholders = (data) => {
  const invalidPlaceholders = [];
  allItems(data).forEach((item) => {
    itemTexts(item).forEach((text) => {
      [...String(text).matchAll(/\{([^}]+)\}/g)].forEach((match) => {
        const token = match[1];
        if (!/^hero:[0-2]$/.test(token) && !allowedPlaceholders.has(token)) {
          invalidPlaceholders.push({ id: item.id, placeholder: token });
        }
      });
    });
  });
  return invalidPlaceholders;
};

const validateSoloCompatibility = (data) =>
  allItems(data)
    .filter((item) => (item.minHeroes ?? 1) < 2 && /\{hero:[12]\}/.test(itemTexts(item).join(" ")))
    .map((item) => ({ id: item.id, minHeroes: item.minHeroes ?? 1 }));

const validateCooldowns = (data) =>
  allItems(data)
    .filter((item) => typeof item.cooldownDays !== "number")
    .map((item) => ({ id: item.id, type: item.beats ? "variant" : "beat" }));

const data = await loadPlayByPlayData();
const coverage = events.map((event) => routeCountForEvent(event, data));
const report = {
  totalEvents: events.length,
  eventsWith15PlusRoutes: coverage.filter((entry) => entry.passes).length,
  eventsBelowTarget: coverage.filter((entry) => !entry.passes),
  invalidPlaceholders: validatePlaceholders(data),
  soloIncompatibleBeats: validateSoloCompatibility(data),
  missingCooldowns: validateCooldowns(data),
};

console.log(JSON.stringify(report, null, 2));

if (report.invalidPlaceholders.length || report.soloIncompatibleBeats.length) {
  process.exitCode = 1;
}
