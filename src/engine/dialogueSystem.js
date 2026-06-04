import dialogueIndex from "../data/dialogueIndex.json";
import { averageTeamRelationship, relationshipCondition } from "./relationships";

const dialogueModules = import.meta.glob("../data/dialogues/*.json");
const dialogueCache = new Map();

export const dialogueCatalogSize = dialogueIndex.total ?? 0;
export const dialogueCategories = dialogueIndex.categories ?? {};

const normalizeDialogue = (dialogue) => ({
  id: dialogue.id,
  priority:
    dialogue.priority ??
    (dialogue.requires?.injury ? 88 : dialogue.requires?.capture ? 82 : dialogue.relationship === "negative" ? 66 : dialogue.relationship === "positive" ? 60 : 32),
  cooldownDays: dialogue.cooldownDays ?? 5,
  heroes: dialogue.heroes ?? ["*"],
  requiredRelationship: dialogue.requiredRelationship ?? dialogue.relationship ?? "any",
  missionTags: dialogue.missionTags ?? ["*"],
  resultTypes: dialogue.resultTypes ?? [dialogue.result ?? "any"],
  tone: dialogue.tone ?? dialogue.temperature ?? "operacional",
  districtId: dialogue.districtId,
  districtTags: dialogue.districtTags ?? [],
  factionId: dialogue.factionId,
  factionTags: dialogue.factionTags ?? [],
  requires: dialogue.requires,
  lines: dialogue.lines ?? [],
  effects: dialogue.effects ?? {},
});

const categoryPath = (category) => `../data/dialogues/dialogues.${category}.json`;

export const loadDialogueCategory = async (category) => {
  if (dialogueCache.has(category)) return dialogueCache.get(category);

  const loader = dialogueModules[categoryPath(category)];
  if (!loader) {
    dialogueCache.set(category, []);
    return [];
  }

  const module = await loader();
  const dialogues = (module.default ?? []).map(normalizeDialogue);
  dialogueCache.set(category, dialogues);
  return dialogues;
};

export const getDialogueCategoriesForContext = (context) => {
  const categories = new Set(["generic"]);
  const resultType = context.resultType ?? "";
  const tags = context.event?.tags ?? [];

  if (context.team?.length > 1) categories.add("duo");
  if (context.event?.districtId || context.event?.bairro) categories.add("district");
  if (context.event?.factionId || context.event?.isFactionEvent) categories.add("faction");
  if (context.capture || resultType === "captura_vilao") categories.add("capture");
  if (context.injury || context.highFatigue || resultType === "traumatico") categories.add("injury");
  if (!context.success || resultType.includes("falha") || resultType === "alerta_perdido") categories.add("failure");
  if ((context.event?.nivelRisco ?? 0) >= 4 || resultType === "falha_grave" || resultType === "traumatico") categories.add("critical");
  if (resultType === "absurdo" || tags.some((tag) => ["boato", "multidao", "transito"].includes(tag))) categories.add("comic");

  return [...categories];
};

export const preloadDialoguesForContext = async (context) =>
  (await Promise.all(getDialogueCategoriesForContext(context).map(loadDialogueCategory))).flat();

const lineSpeaker = (speaker, team) => {
  const key = String(speaker ?? "");
  if (key === "central") return "Central";
  if (key === "dispatcher") return "Dispatcher";
  if (key === "comando") return "Comando";
  if (key.startsWith("hero:")) {
    const index = Number(key.split(":")[1]);
    return team[index]?.codinome ?? team[0]?.codinome ?? "Equipe";
  }

  return team.find((hero) => hero.id === key)?.codinome ?? key;
};

export const missionResultType = ({ success, margin, deaths, injuries, capturedVillain, materialDamage, outcome }) => {
  if (deaths?.length) return "traumatico";
  if (capturedVillain) return "captura_vilao";
  if (!success && margin <= -30) return "falha_grave";
  if (!success) return "falha_parcial";
  if (injuries?.length || materialDamage === "alto" || materialDamage === "severo") return "sucesso_com_dano";
  if (margin >= 35) return "sucesso_exemplar";
  if (outcome === "missão controlada" || outcome === "missao controlada") return "missao_controlada";
  if (Math.random() < 0.08) return "absurdo";
  return "vitoria_apertada";
};

const dialogueScore = (dialogue, context) => {
  const heroIds = context.team.map((hero) => hero.id);
  const recent = context.recentDialogues?.find((entry) => entry.id === dialogue.id);
  if (recent && context.day - recent.day < dialogue.cooldownDays) return -999;

  const specificHeroes = dialogue.heroes.filter((id) => id !== "*");
  if (specificHeroes.some((id) => !heroIds.includes(id))) return -999;

  let score = dialogue.priority ?? 10;
  if (specificHeroes.length > 0) score += 26 + specificHeroes.length * 8;
  if (dialogue.resultTypes.includes(context.resultType)) score += 16;
  else if (dialogue.resultTypes.includes(context.result)) score += 8;
  else if (dialogue.resultTypes.includes("any")) score += 2;
  else return -999;

  if (dialogue.requiredRelationship === context.relationship) score += 16;
  else if (dialogue.requiredRelationship === "any") score += 2;
  else return -999;

  if (dialogue.missionTags.includes("*")) score += 2;
  const tagHits = dialogue.missionTags.filter((tag) => context.event.tags.includes(tag)).length;
  score += tagHits * 7;
  if (!dialogue.missionTags.includes("*") && tagHits === 0) score -= 12;

  if (dialogue.districtId) {
    if (dialogue.districtId !== context.event.districtId) return -999;
    score += 18;
  }

  if (dialogue.factionId) {
    if (dialogue.factionId !== context.event.factionId) return -999;
    score += 20;
  }

  const districtTagHits = (dialogue.districtTags ?? []).filter((tag) => context.event.tags.includes(tag)).length;
  const factionTagHits = (dialogue.factionTags ?? []).filter((tag) => context.event.tags.includes(tag)).length;
  score += districtTagHits * 5 + factionTagHits * 6;

  if (dialogue.requires?.risk === "high" && context.event.nivelRisco < 4) return -999;
  if (dialogue.requires?.fatigue === "high" && !context.highFatigue) return -999;
  if (dialogue.requires?.capture && !context.capture) return -999;
  if (dialogue.requires?.injury && !context.injury) return -999;

  if (context.injury && dialogue.requires?.injury) score += 40;
  if (context.capture && dialogue.requires?.capture) score += 38;
  if (context.highFatigue && dialogue.requires?.fatigue === "high") score += 28;
  if (context.relationship === "positive" && dialogue.requiredRelationship === "positive") score += 10;
  if (context.relationship === "negative" && dialogue.requiredRelationship === "negative") score += 14;

  return score;
};

const fallbackDialogue = (team, success) => ({
  id: `fallback_${success ? "success" : "failure"}`,
  temperature: success ? "operacional" : "tenso",
  tone: success ? "operacional" : "tenso",
  effects: { relationshipChange: success ? 1 : -1, stressChange: success ? -1 : 2, moralChange: success ? 1 : -1 },
  lines:
    team.length > 1
      ? [
          { speaker: team[0].codinome, text: success ? "Ocorrência encerrada. Preciso de água e cinco minutos sem sirene." : "A gente volta, revisa e faz melhor." },
          { speaker: team[1].codinome, text: success ? "Cinco minutos? Otimismo bonito." : "Sem discurso bonito. Primeiro a enfermaria." },
        ]
      : [
          {
            speaker: team[0]?.codinome ?? "Equipe",
            text: success ? "Ocorrência encerrada. Ainda estou inteiro o bastante para assinar o relatório." : "Volto para a base. Depois a gente dá nome ao que deu errado.",
          },
        ],
});

export const selectDialogue = async ({ event, team, relationships, success, injuries, deaths, capturedVillain, recentDialogues = [], day = 1, resultType }) => {
  const avgRelationship = averageTeamRelationship(team, relationships);
  const context = {
    event,
    team,
    day,
    success,
    result: success ? "success" : "failure",
    resultType,
    relationship: relationshipCondition(avgRelationship),
    highFatigue: team.some((hero) => hero.energia < 35 || hero.estresse > 70),
    injury: injuries.length > 0 || deaths.length > 0,
    capture: Boolean(capturedVillain),
    recentDialogues,
  };
  const allDialogues = await preloadDialoguesForContext(context);
  const ranked = allDialogues
    .map((dialogue) => ({ dialogue, score: dialogueScore(dialogue, context) }))
    .filter((entry) => entry.score > -999)
    .sort((first, second) => second.score - first.score);
  const chosen = ranked[0]?.dialogue;

  if (!chosen) return fallbackDialogue(team, success);

  return {
    id: chosen.id,
    temperature: chosen.tone,
    tone: chosen.tone,
    effects: chosen.effects ?? {},
    lines: chosen.lines.map((line) => ({
      speaker: lineSpeaker(line.speaker, team),
      text: line.text,
    })),
  };
};
