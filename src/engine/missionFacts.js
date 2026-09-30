import { moralPressureForEvent } from "./moralSystem";
import { relationshipProfile } from "./relationships";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalize = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const eventText = (event = {}) =>
  normalize(`${event.titulo ?? ""} ${event.descricao ?? ""} ${event.categoria ?? ""} ${(event.tags ?? []).join(" ")}`);

const includesAny = (text, terms) => terms.some((term) => text.includes(term));

const damageSeverity = (damage) => {
  if (damage === "severo") return 5;
  if (damage === "alto") return 4;
  if (damage === "medio" || damage === "médio") return 3;
  return 1;
};

const factId = (event, type, index = 0) => `fact-${event.id}-${type}-${index}`;

const addFact = (facts, event, type, severity, involvedHeroIds = [], tags = [], extra = {}) => {
  facts.push({
    id: factId(event, type, facts.length),
    type,
    severity: clamp(Math.round(severity), 1, 5),
    involvedHeroIds,
    affectedDistrictId: event.districtId,
    affectedVillainId: event.villainId ?? event.vilao?.id,
    tags: [...new Set(tags)],
    ...extra,
  });
};

const heroWithMax = (team, selector) =>
  [...team].sort((first, second) => selector(second) - selector(first))[0] ?? null;

export const deriveMissionFacts = ({ event, team = [], success, margin = 0, civiliansSaved = 0, materialDamage = "baixo", moralAnalysis = null }) => {
  const facts = [];
  const text = eventText(event);
  const pressure = moralPressureForEvent(event);
  const damage = damageSeverity(materialDamage);
  const hasHospital = includesAny(text, ["hospital", "saude", "ala critica", "ambulancia"]);
  const hasEnergy = includesAny(text, ["energia", "gerador", "apagão", "motor", "transformador", "cabos vivos"]);
  const hasPublicHeat = includesAny(text, ["midia", "public", "jornal", "governo", "policia", "boato", "protesto"]);
  const civicHero = heroWithMax(team, (hero) => hero.moralProfile?.civilianPriority ?? 0);
  const directActionHero = heroWithMax(team, (hero) => (hero.moralProfile?.collateralTolerance ?? 0) + (hero.funcao?.includes("energia") ? 12 : 0));
  const protocolBreaker = team.find((hero) => (hero.moralProfile?.authorityRespect ?? 50) <= 40 && (hero.moralProfile?.disobedienceThreshold ?? 60) >= 78);

  if (success && hasHospital) addFact(facts, event, "hospital_saved", 5, team.map((hero) => hero.id), ["cidade", "civis", "hospital"]);
  if (success && civiliansSaved > 0) addFact(facts, event, "civilians_rescued", civiliansSaved >= 40 ? 5 : 3, team.map((hero) => hero.id), ["cidade", "civis"]);
  if (!success && civiliansSaved <= 8) addFact(facts, event, "civilians_harmed", 4, team.map((hero) => hero.id), ["cidade", "civis", "falha"]);

  if (damage >= 4) addFact(facts, event, "infrastructure_destroyed", damage, directActionHero ? [directActionHero.id] : team.map((hero) => hero.id), ["cidade", "infraestrutura"]);
  if (hasEnergy && damage >= 3) addFact(facts, event, "neighborhood_blackout", damage, directActionHero ? [directActionHero.id] : [], ["cidade", "infraestrutura", "energia"]);

  if (protocolBreaker && pressure.protocolPressure >= 24 && (success || margin >= -10)) {
    addFact(facts, event, "hero_disobeyed_order", 3 + (pressure.collateralDemand >= 48 ? 1 : 0), [protocolBreaker.id], ["equipe", "legitimidade", "protocolo"]);
  }

  if (success && team.length > 1 && civicHero) {
    addFact(facts, event, "hero_protected_teammate", 2 + Math.min(2, event.nívelRisco ?? 1), [civicHero.id, team.find((hero) => hero.id !== civicHero.id)?.id].filter(Boolean), ["equipe", "confiança"]);
  }

  if (success && damage <= 1 && (moralAnalysis?.tensionRisk ?? 0) <= 8) {
    addFact(facts, event, "mission_success_clean", 3, team.map((hero) => hero.id), ["cidade", "equipe", "legitimidade"]);
  } else if (success) {
    addFact(facts, event, "mission_success_costly", 3 + Math.min(2, damage), team.map((hero) => hero.id), ["cidade", "equipe"]);
  } else if (civiliansSaved >= 15) {
    addFact(facts, event, "mission_failed_but_lives_saved", 4, team.map((hero) => hero.id), ["cidade", "equipe", "civis"]);
  }

  if (hasPublicHeat && (!success || damage >= 4)) addFact(facts, event, "media_incident", 3 + (success ? 0 : 1), team.map((hero) => hero.id), ["legitimidade", "midia"]);
  if ((event.nívelRisco ?? 1) >= 4 && !success) addFact(facts, event, "government_angry", 4, team.map((hero) => hero.id), ["legitimidade", "governo"]);
  if (event.factionId && success && damage <= 2) addFact(facts, event, "police_embarrassed", 2, team.map((hero) => hero.id), ["legitimidade", "policia"]);

  return facts;
};

const factTypes = (facts = []) => new Set(facts.map((fact) => fact.type));

const factByType = (facts = [], type) => facts.find((fact) => fact.type === type);

const reasonText = (parts) => parts.filter(Boolean).join(" ");

export const relationshipDeltaFromFacts = ({ fromHero, toHero, event, facts = [], relationships = {}, success }) => {
  const types = factTypes(facts);
  const fromProfile = fromHero.moralProfile ?? {};
  const toProfile = toHero.moralProfile ?? {};
  const relation = relationshipProfile(relationships, fromHero.id, toHero.id);
  const delta = { trust: 0, respect: 0, closeness: 0, tension: 0 };
  const sourceFactIds = [];
  const reasons = [];

  const useFact = (type) => {
    const fact = factByType(facts, type);
    if (fact) sourceFactIds.push(fact.id);
    return fact;
  };

  const protection = factByType(facts, "hero_protected_teammate");
  if (protection?.involvedHeroIds?.[0] === toHero.id && protection?.involvedHeroIds?.includes(fromHero.id)) {
    delta.trust += 5;
    delta.closeness += 2;
    delta.respect += 2;
    sourceFactIds.push(protection.id);
    reasons.push(`${toHero.codinome} protegeu ${fromHero.codinome} durante a crise.`);
  }

  if (types.has("mission_success_clean")) {
    const fact = useFact("mission_success_clean");
    delta.trust += 2;
    delta.respect += 1;
    reasons.push(`A missão limpa reforcou a leitura de ${fromHero.codinome} sobre ${toHero.codinome}.`);
    if (fact?.severity >= 4) delta.closeness += 1;
  }

  if (types.has("mission_success_costly")) {
    useFact("mission_success_costly");
    delta.respect += success ? 1 : 0;
    delta.tension += 1;
    reasons.push("A equipe venceu, mas o custo da resposta ficou no ar.");
  }

  const disobedience = factByType(facts, "hero_disobeyed_order");
  if (disobedience?.involvedHeroIds?.includes(toHero.id)) {
    sourceFactIds.push(disobedience.id);
    if ((fromProfile.civilianPriority ?? 0) >= 85 && types.has("civilians_rescued")) {
      delta.respect += 3;
      delta.tension += 1;
      reasons.push(`${fromHero.codinome} viu desobediência, mas também viu vidas salvas.`);
    }
    if ((fromProfile.authorityRespect ?? 0) >= 70) {
      delta.tension += 4;
      delta.trust -= 1;
      reasons.push(`${fromHero.codinome} ficou desconfortável com a quebra de protocolo de ${toHero.codinome}.`);
    }
  }

  if ((types.has("infrastructure_destroyed") || types.has("neighborhood_blackout")) && (fromProfile.collateralTolerance ?? 50) <= 24 && (toProfile.collateralTolerance ?? 0) >= 55) {
    sourceFactIds.push(...facts.filter((fact) => ["infrastructure_destroyed", "neighborhood_blackout"].includes(fact.type)).map((fact) => fact.id));
    delta.tension += 4;
    delta.respect -= 2;
    reasons.push(`${fromHero.codinome} atribuiu parte do dano colateral ao estilo de ${toHero.codinome}.`);
  }

  if (types.has("mission_failed_but_lives_saved") && (fromProfile.civilianPriority ?? 0) >= 80) {
    useFact("mission_failed_but_lives_saved");
    delta.closeness += 2;
    delta.respect += 1;
    reasons.push("A missão falhou no placar, mas vidas salvas pesaram mais para este vínculo.");
  }

  if (types.has("media_incident") && Math.abs((fromProfile.publicExposureComfort ?? 45) - (toProfile.publicExposureComfort ?? 45)) >= 32) {
    useFact("media_incident");
    delta.tension += 2;
    reasons.push("A exposição pública abriu diferenca de postura entre os dois.");
  }

  if (types.has("civilians_harmed")) {
    useFact("civilians_harmed");
    delta.trust -= 2;
    delta.tension += 3;
    reasons.push("Civis feridos deixaram a confiança operacional mais frágil.");
  }

  const scoreDelta = Math.round(delta.trust * 0.34 + delta.respect * 0.28 + delta.closeness * 0.24 - delta.tension * 0.42);
  if (!scoreDelta && !sourceFactIds.length) return null;

  return {
    fromHeroId: fromHero.id,
    toHeroId: toHero.id,
    key: `${fromHero.id}__${toHero.id}`,
    names: [fromHero.codinome, toHero.codinome],
    delta,
    scoreDelta,
    reason: reasonText(reasons) || "A missão alterou a leitura emocional entre os heróis.",
    sourceMissionId: null,
    sourceFactIds: [...new Set(sourceFactIds)],
    beforeAxes: relation,
  };
};



