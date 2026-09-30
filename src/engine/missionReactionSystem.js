import rules from "../data/alpha11_12/alpha_1_1/mission_reaction_rules.json";
import { relationshipProfile, relationshipScore } from "./relationships";
import { deterministicRoll, makeAuditEvent } from "./seededRng";

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(Number(value) || 0)));

const normalize = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const eventTags = (event = {}) =>
  new Set(
    [
      event.categoria,
      event.tipo,
      event.riskTag,
      ...(event.tags ?? []),
      ...(event.moralTags ?? []),
      event.legalStatus,
      event.mandado ? "warrant" : null,
      event.autorizacaoLetal ? "lethal_authorized" : null,
    ]
      .filter(Boolean)
      .map(normalize),
  );

const missionDemands = (event = {}) => {
  const tags = eventTags(event);
  const text = normalize(`${event.titulo ?? ""} ${event.descricao ?? ""} ${event.briefingOperacional ?? ""}`);
  return {
    preservationOfLife: tags.has("civis") || tags.has("hospital") || text.includes("civil") || text.includes("hospital") ? 88 : 52,
    ruleOfLaw: tags.has("illegal_order") || tags.has("sem_mandado") || text.includes("sem mandado") ? 20 : tags.has("protocolo") ? 72 : 55,
    truthTransparency: tags.has("midia") || tags.has("desinformacao") || text.includes("boato") ? 78 : 50,
    proportionality: tags.has("infraestrutura") || tags.has("gerador") || text.includes("explod") ? 72 : 50,
    autonomy: tags.has("negociacao") || text.includes("rendicao") ? 70 : 48,
    redemption: tags.has("captura") || tags.has("reabilitacao") ? 68 : 45,
    collectiveGood: tags.has("apagão") || tags.has("facção") || tags.has("faccao") ? 82 : 55,
  };
};

const bandForScore = (score) =>
  (rules.bands ?? []).find((band) => score >= band.min && score <= band.max) ?? {
    label: score < 30 ? "strained" : score > 70 ? "committed" : "hesitant",
    behavior: [],
    stateEffects: {},
  };

const missionPreferenceScore = (hero, event) => {
  const profile = hero.alphaCharacterProfile ?? {};
  const preferences = profile.missionPreferences ?? {};
  const tags = eventTags(event);
  const liked = (preferences.preferredTags ?? []).filter((tag) => tags.has(normalize(tag))).length;
  const avoided = (preferences.avoidTags ?? preferences.rejectedTags ?? []).filter((tag) => tags.has(normalize(tag))).length;
  return liked * 8 - avoided * 12;
};

const moralAlignment = (hero, event) => {
  const axes = hero.alphaCharacterProfile?.moralProfile?.axes ?? hero.moralProfile ?? {};
  const demands = missionDemands(event);
  const conflicts = [];
  const names = {
    preservationOfLife: "preservacao da vida",
    ruleOfLaw: "legalidade",
    truthTransparency: "transparencia",
    proportionality: "proporcionalidade",
    autonomy: "autonomia",
    redemption: "redencao",
    collectiveGood: "bem coletivo",
  };
  let score = 0;

  Object.entries(demands).forEach(([axis, demand]) => {
    const value = axes[axis] ?? hero.moralProfile?.[axis] ?? 50;
    const gap = Math.abs(value - demand);
    if (gap <= 18) {
      score += 3;
      return;
    }
    const penalty = Math.round(gap / 8);
    score -= penalty;
    if (gap >= 34) {
      conflicts.push({
        axis,
        label: names[axis] ?? axis,
        intensity: clamp(gap, 0, 100),
        demand,
        heroValue: value,
        explanation: `${hero.codinome} lê ${names[axis] ?? axis} em ${value}, mas a missão exige ${demand}.`,
      });
    }
  });

  return { score, conflicts };
};

const relationshipSupport = (hero, team, relationships) => {
  const others = team.filter((candidate) => candidate.id !== hero.id);
  if (!others.length) return { score: 0, notes: [] };
  const profiles = others.map((other) => ({ other, profile: relationshipProfile(relationships, hero.id, other.id) }));
  const score = Math.round(
    profiles.reduce((sum, item) => sum + relationshipScore(item.profile) * 0.12 + (item.profile.operationalSynergy ?? 0) * 0.05 - (item.profile.resentment ?? 0) * 0.04, 0),
  );
  const notes = profiles
    .sort((first, second) => Math.abs(relationshipScore(second.profile)) - Math.abs(relationshipScore(first.profile)))
    .slice(0, 2)
    .map(({ other, profile }) => ({
      toHeroId: other.id,
      label: other.codinome,
      score: relationshipScore(profile),
      memory: profile.memories?.[0]?.summary,
    }));
  return { score, notes };
};

const competenceFit = (hero, event) => {
  const requirements = event.requisitosPrincipais ?? [];
  if (!requirements.length) return 0;
  const values = requirements.map((attribute) => hero.atributos?.[attribute] ?? 5);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) - 5;
};

export const buildMissionContext = ({ event, team = [], leaderId = null }) => ({
  id: `ctx-${event.id}-${team.map((hero) => hero.id).join("-")}`,
  eventId: event.id,
  type: event.categoria ?? event.tipo ?? "occurrence",
  tags: [...eventTags(event)],
  teamIds: team.map((hero) => hero.id),
  leaderId: leaderId ?? team[0]?.id ?? null,
  districtId: event.districtId,
  villainId: event.villainId,
  civilianRisk: event.nívelRisco >= 4 ? "alto" : event.nívelRisco >= 2 ? "medio" : "baixo",
  collateralRisk: missionDemands(event).proportionality,
  warrant: Boolean(event.mandado),
  evidenceStrength: event.evidenceStrength ?? 45,
  lethalAuthorization: Boolean(event.autorizacaoLetal),
  facts: event.missionFacts ?? [],
  unknowns: event.unknowns ?? [],
});

export const calculateHeroMissionReaction = ({ state, event, hero, team = [], relationships = {}, leaderId = null }) => {
  const moral = moralAlignment(hero, event);
  const relation = relationshipSupport(hero, team, relationships);
  const dynamic = hero.dynamicState ?? {};
  const variance = deterministicRoll({
    seed: state?.campaignSeed ?? "central-crise",
    namespace: "mission-reaction",
    correlationId: `${event.id}:${hero.id}:${team.map((item) => item.id).join(",")}`,
    min: -4,
    max: 4,
  });
  const stressPenalty = Math.round(((dynamic.stress ?? hero.estresse ?? 10) + (dynamic.unresolvedTrauma ?? 0)) / 10);
  const fatiguePenalty = Math.round(((dynamic.fatigue ?? hero.fatigue ?? 0) + Math.max(0, 100 - (hero.energia ?? 90))) / 14);
  const commandTrust = Math.round(((dynamic.trustInCommand ?? 60) - 50) / 5);
  const leaderBonus = leaderId === hero.id ? 3 : 0;
  const score = clamp(
    58 +
      missionPreferenceScore(hero, event) +
      moral.score +
      relation.score +
      competenceFit(hero, event) +
      commandTrust +
      leaderBonus +
      variance -
      stressPenalty -
      fatiguePenalty,
  );
  const band = bandForScore(score);
  const positives = [
    relation.score > 3 ? "relacao de equipe ajuda a entrada em campo" : null,
    competenceFit(hero, event) > 2 ? "competencia bate com os requisitos" : null,
    moral.score > 4 ? "valores alinhados com a missão" : null,
  ].filter(Boolean);
  const negatives = [
    stressPenalty >= 5 ? "estado emocional pressiona a decisao" : null,
    fatiguePenalty >= 4 ? "fadiga reduz margem de confiança" : null,
    ...moral.conflicts.slice(0, 2).map((conflict) => conflict.explanation),
  ].filter(Boolean);
  const possibleRefusal = score <= 24 || moral.conflicts.some((conflict) => conflict.axis === "ruleOfLaw" && conflict.intensity >= 50);

  return {
    heroId: hero.id,
    heroName: hero.codinome,
    reactionScore: score,
    band: band.label,
    behavior: band.behavior ?? [],
    spokenReaction:
      hero.alphaCharacterProfile?.voice?.underStress?.[0] ??
      (possibleRefusal ? "Isso precisa ser explicado antes de eu entrar." : "Entendido. Eu entro sabendo o custo."),
    positiveFactors: positives.slice(0, 3),
    negativeFactors: negatives.slice(0, 3),
    moralConflicts: moral.conflicts,
    relationshipNotes: relation.notes,
    stateDelta: band.stateEffects ?? {},
    possibleRefusal,
    seedTrace: {
      namespace: "mission-reaction",
      correlationId: `${event.id}:${hero.id}:${team.map((item) => item.id).join(",")}`,
      variance,
    },
  };
};

export const calculateMissionReactions = ({ state, event, team = [], relationships = {}, leaderId = null }) => {
  const context = buildMissionContext({ event, team, leaderId });
  const reactions = team.map((hero) => calculateHeroMissionReaction({ state, event, hero, team, relationships, leaderId }));
  return {
    context,
    reactions,
    event: makeAuditEvent({
      type: "MISSION_REACTION_CALCULATED",
      summary: "Reação de equipe calculada antes do despacho.",
      day: state?.day ?? 1,
      tick: (state?.history?.length ?? 0) + 1,
      causationId: event.id,
      correlationId: context.id,
      payload: {
        eventId: event.id,
        teamIds: team.map((hero) => hero.id),
        reactions: reactions.map((reaction) => ({
          heroId: reaction.heroId,
          reactionScore: reaction.reactionScore,
          band: reaction.band,
          possibleRefusal: reaction.possibleRefusal,
        })),
      },
    }),
  };
};




