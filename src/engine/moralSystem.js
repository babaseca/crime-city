import { relationshipProfile } from "./relationships";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const tagText = (event) => `${event?.tags?.join(" ") ?? ""} ${event?.categoria ?? ""} ${event?.descricao ?? ""}`.toLowerCase();

const hasAny = (text, terms) => terms.some((term) => text.includes(term));

export const moralPressureForEvent = (event = {}) => {
  const text = tagText(event);
  const civilianRisk =
    (event.nivelRisco ?? 1) * 9 +
    (hasAny(text, ["civil", "hospital", "evacu", "resgate", "multidao", "escola"]) ? 18 : 0);
  const collateralDemand =
    (event.dificuldade ?? 50) * 0.35 +
    (hasAny(text, ["infra", "energia", "gerador", "ponte", "estrutura", "apagao", "drones", "motores"]) ? 24 : 0);
  const legitimacyDemand =
    (hasAny(text, ["midia", "boato", "protesto", "public", "jornal", "rede", "governo"]) ? 32 : 0) +
    (event.factionId ? 8 : 0);
  const reformDemand = event.villainId || event.vilao ? 22 : 0;
  const protocolPressure = (event.nivelRisco ?? 1) >= 4 || (event.dificuldade ?? 0) >= 72 ? 28 : 12;

  return {
    civilianRisk: clamp(civilianRisk, 0, 100),
    collateralDemand: clamp(collateralDemand, 0, 100),
    legitimacyDemand: clamp(legitimacyDemand, 0, 100),
    reformDemand: clamp(reformDemand, 0, 100),
    protocolPressure: clamp(protocolPressure, 0, 100),
  };
};

export const heroMoralFit = (hero, event) => {
  const profile = hero?.moralProfile;
  if (!profile) return { heroId: hero?.id, bonus: 0, stress: 0, notes: [] };

  const pressure = moralPressureForEvent(event);
  const notes = [];
  let bonus = 0;
  let stress = 0;

  if (pressure.civilianRisk >= 45) {
    bonus += (profile.civilianPriority - 70) / 9;
    if (profile.civilianPriority >= 90) notes.push("civis_primeiro");
  }

  if (pressure.collateralDemand >= 48) {
    const tolerance = profile.collateralTolerance ?? 30;
    bonus += tolerance >= 55 ? 3 : tolerance <= 20 ? -2 : 0;
    stress += tolerance <= 20 ? 3 : 0;
    if (tolerance >= 60) notes.push("aceita_dano_estrutural");
    if (tolerance <= 20) notes.push("preservacao_extrema");
  }

  if (pressure.legitimacyDemand >= 28) {
    bonus += ((profile.publicExposureComfort ?? 45) - 45) / 14;
    bonus += ((profile.authorityRespect ?? 50) - 50) / 28;
    if ((profile.publicExposureComfort ?? 0) >= 75) notes.push("bom_sob_holofote");
  }

  if (pressure.reformDemand >= 20) {
    bonus += ((profile.villainReformSupport ?? 45) - 45) / 18;
    if ((profile.villainReformSupport ?? 0) <= 30) notes.push("duro_com_viloes");
    if ((profile.villainReformSupport ?? 0) >= 75) notes.push("apoia_reforma");
  }

  if (pressure.protocolPressure >= 24) {
    const disobedience = profile.disobedienceThreshold ?? 65;
    bonus += disobedience >= 80 ? 2 : 0;
    stress += (profile.authorityRespect ?? 50) >= 78 && disobedience >= 75 ? 2 : 0;
  }

  return {
    heroId: hero.id,
    heroName: hero.codinome,
    bonus: Math.round(clamp(bonus, -8, 8)),
    stress: Math.round(clamp(stress, 0, 8)),
    notes,
  };
};

const pairMoralFriction = (first, second, event, relationships) => {
  const firstProfile = first?.moralProfile;
  const secondProfile = second?.moralProfile;
  if (!firstProfile || !secondProfile) return null;

  const pressure = moralPressureForEvent(event);
  const relation = relationshipProfile(relationships, first.id, second.id);
  const trustBuffer = ((relation.trust ?? 50) + (relation.respect ?? 50)) / 2;
  const tensionBase = relation.tension ?? 0;
  const notes = [];
  let pressureScore = 0;

  const collateralGap = Math.abs((firstProfile.collateralTolerance ?? 30) - (secondProfile.collateralTolerance ?? 30));
  if (pressure.collateralDemand >= 48 && collateralGap >= 34) {
    pressureScore += collateralGap * 0.1;
    notes.push("dano_colateral");
  }

  const authorityGap = Math.abs((firstProfile.authorityRespect ?? 50) - (secondProfile.authorityRespect ?? 50));
  if (pressure.protocolPressure >= 24 && authorityGap >= 34) {
    pressureScore += authorityGap * 0.08;
    notes.push("protocolo_vs_improviso");
  }

  const reformGap = Math.abs((firstProfile.villainReformSupport ?? 45) - (secondProfile.villainReformSupport ?? 45));
  if (pressure.reformDemand >= 20 && reformGap >= 38) {
    pressureScore += reformGap * 0.07;
    notes.push("reforma_de_viloes");
  }

  if (!notes.length) return null;

  const buffered = pressureScore + tensionBase * 0.08 - trustBuffer * 0.06;

  return {
    heroIds: [first.id, second.id],
    names: [first.codinome, second.codinome],
    score: Math.round(clamp(buffered, 1, 18)),
    notes,
  };
};

export const analyzeTeamMorals = (event, team = [], relationships = {}) => {
  const heroFits = team.map((hero) => heroMoralFit(hero, event));
  const pairFriction = [];

  for (let i = 0; i < team.length; i += 1) {
    for (let j = i + 1; j < team.length; j += 1) {
      const friction = pairMoralFriction(team[i], team[j], event, relationships);
      if (friction) pairFriction.push(friction);
    }
  }

  const bonus = heroFits.reduce((sum, fit) => sum + fit.bonus, 0) / Math.max(1, heroFits.length);
  const stress = heroFits.reduce((sum, fit) => sum + fit.stress, 0) / Math.max(1, heroFits.length);
  const tensionRisk = pairFriction.reduce((sum, friction) => sum + friction.score, 0);

  return {
    bonus: Math.round(clamp(bonus - tensionRisk * 0.16, -10, 10)),
    stress: Math.round(clamp(stress + tensionRisk * 0.18, 0, 14)),
    tensionRisk: Math.round(clamp(tensionRisk, 0, 30)),
    heroFits,
    pairFriction,
  };
};

export const moralSummaryLabel = (analysis) => {
  if (!analysis || (!analysis.bonus && !analysis.tensionRisk)) return "Neutra";
  if (analysis.tensionRisk >= 16) return "Conflito moral";
  if (analysis.bonus >= 4) return "Valores alinhados";
  if (analysis.bonus <= -4) return "Valores pressionados";
  return "Atrito controlado";
};
