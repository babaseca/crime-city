import districtData from "../data/districts.json";

export const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const slug = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const baseStats = {
  alertsGenerated: 0,
  alertsResolved: 0,
  alertsFailed: 0,
  civiliansSaved: 0,
  collateralDamage: 0,
  villainsCaptured: 0,
  daysNeglected: 0,
};

export const initializeDistricts = () =>
  districtData.map((district) => ({
    ...district,
    stats: { ...baseStats, ...(district.stats ?? {}) },
    recentHistory: district.recentHistory ?? [],
    crisis: district.crisis ?? null,
    dangerLevel: calculateDistrictDanger(district),
  }));

export const districtIdFromName = (name) => {
  const normalized = slug(name);
  return districtData.find((district) => slug(district.name) === normalized)?.id ?? normalized;
};

export const getDistrictById = (districts, districtId) =>
  districts.find((district) => district.id === districtId || district.name === districtId) ?? null;

export const calculateDistrictDanger = (district) => {
  const maxFactionInfluence = Math.max(0, ...Object.values(district.activeFactionInfluence ?? {}));
  return clamp(
    district.crimeLevel * 0.34 +
      (100 - district.stability) * 0.28 +
      (100 - district.infrastructure) * 0.18 +
      maxFactionInfluence * 0.14 +
      (district.stats?.daysNeglected ?? 0) * 2,
  );
};

const damageScore = (damage) => {
  if (damage === "severo") return 8;
  if (damage === "alto") return 5;
  if (damage === "médio" || damage === "medio") return 3;
  return 1;
};

export const getDistrictModifiersForEvent = (district, event) => {
  if (!district) return [];
  return (district.modifiers ?? []).filter((modifier) => {
    const tags = modifier.effect?.eventTags ?? [];
    return tags.length === 0 || tags.some((tag) => event.tags?.includes(tag));
  });
};

const sumModifier = (district, event, key) =>
  getDistrictModifiersForEvent(district, event).reduce((total, modifier) => total + (modifier.effect?.[key] ?? 0), 0);

export const updateDistrictFactionInfluence = (district, factionId, amount) => {
  if (!district || !factionId) return district;
  const influence = district.activeFactionInfluence ?? {};
  return {
    ...district,
    activeFactionInfluence: {
      ...influence,
      [factionId]: clamp((influence[factionId] ?? 0) + amount),
    },
  };
};

export const checkDistrictCrisisTriggers = (district) => {
  if (district.stability <= 24) return { type: "tomada_por_faccao", label: "tomada por facção" };
  if (district.infrastructure <= 25) return { type: "apagao_local", label: "apagão local" };
  if (district.trustInCentral <= 24) return { type: "protesto", label: "protesto contra a Central" };
  if (district.populationMood <= 20) return { type: "medo_generalizado", label: "medo generalizado" };
  return null;
};

export const districtTrend = (district) => {
  if (district.crisis) return "em crise";
  if (district.stats.daysNeglected >= 3 || district.stability < 38 || district.trustInCentral < 34) return "piorando";
  if (district.stability >= 66 && district.trustInCentral >= 58) return "melhorando";
  return "estável";
};

export const applyMissionResultToDistrict = (district, missionResult) => {
  if (!district || !missionResult) return district;
  const event = missionResult.event;
  const success = missionResult.success;
  const saved = missionResult.civiliansSaved ?? 0;
  const damage = damageScore(missionResult.materialDamage);
  const trustSuccess = sumModifier(district, event, "trustSuccessModifier");
  const trustFailure = sumModifier(district, event, "trustFailureModifier");
  const infraFailure = sumModifier(district, event, "infrastructureFailureModifier");
  const repFailure = sumModifier(district, event, "reputationFailureModifier");
  const factionId = event.factionId ?? district.dominantFactionId;

  let next = {
    ...district,
    stats: {
      ...district.stats,
      alertsResolved: district.stats.alertsResolved + (success ? 1 : 0),
      alertsFailed: district.stats.alertsFailed + (success ? 0 : 1),
      civiliansSaved: district.stats.civiliansSaved + saved,
      collateralDamage: district.stats.collateralDamage + damage,
      villainsCaptured: district.stats.villainsCaptured + (missionResult.capturedVillain ? 1 : 0),
      daysNeglected: success ? 0 : Math.min(9, district.stats.daysNeglected + 1),
    },
    recentHistory: [
      {
        day: missionResult.day,
        title: event.titulo,
        outcome: missionResult.outcome,
        success,
        impact: success ? "proteção" : "instabilidade",
      },
      ...(district.recentHistory ?? []),
    ].slice(0, 8),
    populationMood: clamp(district.populationMood + (success ? 1 + Math.floor(saved / 35) : -2 - damage)),
    trustInCentral: clamp(district.trustInCentral + (success ? 2 + Math.floor(saved / 28) + trustSuccess : -3 - damage + trustFailure)),
    stability: clamp(district.stability + (success ? 2 : -4 - damage)),
    crimeLevel: clamp(district.crimeLevel + (success ? -2 : 3 + Math.floor(damage / 2))),
    infrastructure: clamp(district.infrastructure + (success ? -Math.max(0, damage - 4) : -damage + infraFailure)),
    mediaAttention: clamp(district.mediaAttention + Math.abs(missionResult.reputationDelta ?? 0) + (repFailure < 0 ? 2 : 0)),
  };

  if (missionResult.capturedVillain || (success && event.isFactionEvent)) {
    next = updateDistrictFactionInfluence(next, factionId, missionResult.capturedVillain ? -8 : -3);
  } else if (!success && factionId) {
    next = updateDistrictFactionInfluence(next, factionId, 4);
  }

  const crisis = checkDistrictCrisisTriggers(next);
  next = { ...next, crisis, dangerLevel: calculateDistrictDanger(next) };

  return next;
};

export const applyMissionResultToDistricts = (districts, missionResult) => {
  const districtId = missionResult.event.districtId ?? districtIdFromName(missionResult.event.bairro);
  return districts.map((district) =>
    district.id === districtId ? applyMissionResultToDistrict(district, missionResult) : district,
  );
};

export const applyDailyDistrictDecay = (districts, resolvedDistrictIds = []) =>
  districts.map((district) => {
    const wasResolved = resolvedDistrictIds.includes(district.id);
    const neglect = wasResolved ? 0 : Math.min(9, (district.stats?.daysNeglected ?? 0) + 1);
    const pressure = neglect >= 3 ? 2 : 1;
    const next = {
      ...district,
      stats: {
        ...district.stats,
        daysNeglected: neglect,
      },
      trustInCentral: clamp(district.trustInCentral + (wasResolved ? 1 : -pressure)),
      stability: clamp(district.stability + (wasResolved ? 1 : -pressure)),
      crimeLevel: clamp(district.crimeLevel + (wasResolved ? -1 : pressure)),
      infrastructure: clamp(district.infrastructure - (district.crisis ? 1 : 0)),
    };
    const crisis = checkDistrictCrisisTriggers(next);
    return { ...next, crisis, dangerLevel: calculateDistrictDanger(next) };
  });

export const markDistrictAlertsGenerated = (districts, events) => {
  const counts = new Map();
  events.forEach((event) => counts.set(event.districtId, (counts.get(event.districtId) ?? 0) + 1));
  return districts.map((district) => ({
    ...district,
    stats: {
      ...district.stats,
      alertsGenerated: district.stats.alertsGenerated + (counts.get(district.id) ?? 0),
    },
  }));
};

export const getMostDangerousDistricts = (districts, limit = 3) =>
  [...districts].sort((first, second) => calculateDistrictDanger(second) - calculateDistrictDanger(first)).slice(0, limit);
