import alphaHeroes from "../data/alpha095_new_heroes_180.json";
import alphaVillains from "../data/alpha095_new_villains_300.json";
import { events } from "../data/events";
import { heroes as baseHeroes } from "../data/heroes";
import baseVillains from "../data/villains.json";
import {
  generatePlayByPlayCoverageReport,
  validateCooldowns,
  validatePlaceholders,
  validateSoloCompatibility,
} from "./playByPlayValidation";
import { staticPlayByPlayData, variantCompatibleWithHeroCount } from "./playByPlaySystem";

const requiredHeroFields = ["id", "codinome", "atributos", "imageUrl"];
const requiredVillainFields = ["id", "alcunha", "estadoAtual", "periculosidade", "imageUrl"];

export const validateNoDuplicateIds = (records = [], label = "records") => {
  const seen = new Set();
  return records
    .filter((record) => {
      if (!record?.id) return true;
      if (seen.has(record.id)) return true;
      seen.add(record.id);
      return false;
    })
    .map((record) => ({ type: "duplicate_or_missing_id", label, id: record?.id ?? null }));
};

export const validateRequiredFields = (records = [], fields = [], label = "records") =>
  records.flatMap((record) =>
    fields
      .filter((field) => record?.[field] === undefined || record?.[field] === null || record?.[field] === "")
      .map((field) => ({ type: "missing_field", label, id: record?.id ?? null, field })),
  );

export const validateHeroDatabase = (heroes = []) => [
  ...validateNoDuplicateIds(heroes, "heroes"),
  ...validateRequiredFields(heroes, requiredHeroFields, "heroes"),
  ...heroes
    .filter((hero) => !Object.keys(hero.atributos ?? hero.stats ?? {}).length)
    .map((hero) => ({ type: "missing_attributes", label: "heroes", id: hero.id })),
];

export const validateVillainDatabase = (villains = []) => [
  ...validateNoDuplicateIds(villains, "villains"),
  ...validateRequiredFields(villains, requiredVillainFields, "villains"),
  ...villains
    .filter((villain) => !["desconhecido", "suspeito", "fugitivo", "capturado", "preso", "em_reabilitacao", "informante", "reformado", "aliado_condicional"].includes(villain.visibility ?? villain.estadoAtual))
    .map((villain) => ({ type: "unknown_visibility_state", label: "villains", id: villain.id, value: villain.visibility ?? villain.estadoAtual })),
];

export const validateDialogueDatabase = (dialogues = []) =>
  dialogues.flatMap((dialogue) =>
    (dialogue.lines ?? []).flatMap((line, index) => {
      const issues = [];
      if (!line.speaker) issues.push({ type: "missing_speaker", id: dialogue.id, line: index });
      if (!line.text || /\b(undefined|null)\b/i.test(String(line.text))) issues.push({ type: "broken_dialogue_text", id: dialogue.id, line: index });
      if (/^hero:[3-9]\d*$/.test(String(line.speaker))) issues.push({ type: "unsupported_hero_speaker", id: dialogue.id, line: index, speaker: line.speaker });
      return issues;
    }),
  );

export const validatePlayByPlayDatabase = (playByPlayData = staticPlayByPlayData) => {
  const compatibilityIssues = [
    ...(playByPlayData.genericBeats ?? []),
    ...(playByPlayData.resultBeats ?? []),
    ...(playByPlayData.districtBeats ?? []),
    ...(playByPlayData.factionBeats ?? []),
    ...(playByPlayData.heroRoleBeats ?? []),
    ...(playByPlayData.comboBeats ?? []),
    ...(playByPlayData.injuryBeats ?? []),
    ...(playByPlayData.captureBeats ?? []),
    ...(playByPlayData.eventVariants ?? []),
  ]
    .filter((item) => !variantCompatibleWithHeroCount(item, item.minHeroes ?? 1))
    .map((item) => ({ type: "hero_placeholder_exceeds_min_heroes", id: item.id, minHeroes: item.minHeroes ?? 1 }));

  return {
    coverage: generatePlayByPlayCoverageReport(events, playByPlayData),
    invalidPlaceholders: validatePlaceholders(playByPlayData),
    soloIncompatibleBeats: validateSoloCompatibility(playByPlayData),
    missingCooldowns: validateCooldowns(playByPlayData),
    compatibilityIssues,
  };
};

export const runNarrativeValidation = ({
  heroes = [...baseHeroes, ...alphaHeroes],
  villains = [...baseVillains, ...alphaVillains],
  playByPlayData = staticPlayByPlayData,
  dialogues = [],
} = {}) => ({
  heroes: validateHeroDatabase(heroes),
  villains: validateVillainDatabase(villains),
  playByPlay: validatePlayByPlayDatabase(playByPlayData),
  dialogues: validateDialogueDatabase(dialogues),
});
