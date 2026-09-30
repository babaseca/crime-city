import factionData from "../data/factions.json";
import { clamp, getDistrictById } from "./districtSystem";

const slug = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

export const initializeFactions = () =>
  factionData.map((faction) => ({
    ...faction,
    recentEvents: faction.recentEvents ?? [],
    status: checkFactionStatus(faction),
  }));

export const factionIdFromName = (name) => factionData.find((faction) => slug(faction.name) === slug(name))?.id ?? null;

export const getFactionById = (factions, factionId) => factions.find((faction) => faction.id === factionId) ?? null;

export const checkFactionStatus = (faction) => {
  if (faction.threatLevel <= 18 && faction.resources <= 18) return "desmantelada";
  if (faction.threatLevel <= 36 || faction.resources <= 30) return "enfraquecida";
  if (faction.heat >= faction.retaliationThreshold + 18 && faction.resources >= 55) return "em guerra";
  if (faction.heat >= faction.retaliationThreshold) return "em retaliação";
  return faction.status === "oculta" ? "oculta" : "ativa";
};

export const calculateFactionRetaliationRisk = (faction) =>
  clamp(faction.heat * 0.44 + faction.resources * 0.24 + faction.threatLevel * 0.26 - faction.retaliationThreshold * 0.25);

export const applyMissionResultToFaction = (faction, missionResult) => {
  if (!faction || !missionResult) return faction;
  const involved = missionResult.event.factionId === faction.id || faction.territories.includes(missionResult.event.districtId);
  if (!involved) return faction;

  const capture = Boolean(missionResult.capturedVillain);
  const success = missionResult.success;
  const alpha = missionResult.alphaConsequences ?? {};
  const heatDelta = success ? 5 + (capture ? 10 : 0) : -3;
  const resourcesDelta = success ? -4 - (capture ? 7 : 0) : 5;
  const threatDelta = success ? -2 - (capture ? 2 : 0) : 4;
  const next = {
    ...faction,
    heat: clamp(faction.heat + heatDelta + (alpha.factionHeat ?? 0)),
    resources: clamp(faction.resources + resourcesDelta + (alpha.factionResources ?? 0)),
    threatLevel: clamp(faction.threatLevel + threatDelta + (alpha.factionThreat ?? 0)),
    publicFear: clamp(faction.publicFear + (success ? -1 : 3)),
    recentEvents: [
      {
        day: missionResult.day,
        title: missionResult.event.titulo,
        result: success ? "pressionada pela Central" : "ganhou espaço",
        districtId: missionResult.event.districtId,
      },
      ...(faction.recentEvents ?? []),
    ].slice(0, 8),
  };

  return { ...next, status: checkFactionStatus(next) };
};

export const applyMissionResultToFactions = (factions, missionResult) =>
  factions.map((faction) => applyMissionResultToFaction(faction, missionResult));

export const generateFactionEvent = (faction, districts, day = 1) => {
  const risk = calculateFactionRetaliationRisk(faction);
  if (risk < 48 || day < 3 || faction.status === "desmantelada") return null;
  const targetDistrict =
    faction.territories.map((id) => getDistrictById(districts, id)).filter(Boolean).sort((a, b) => b.dangerLevel - a.dangerLevel)[0] ??
    districts[0];
  if (!targetDistrict) return null;
  const titleByTag = faction.tags.includes("energia")
    ? "Sabotagem elétrica coordenada"
    : faction.tags.includes("boato")
      ? "Pânico fabricado nos canais locais"
      : faction.tags.includes("subsolo")
        ? "Rota clandestina abre sob a rua"
        : faction.tags.includes("tecnologia")
          ? "Drones sem identificação cercam a área"
          : "Ameaça pública da facção";

  return {
    id: `faction-${faction.id}-${day}-${targetDistrict.id}`,
    titulo: `${titleByTag} em ${targetDistrict.name}`,
    description: `${faction.name} reagiu à pressão da Central e testou presença em ${targetDistrict.name}.`,
    descricao: `${faction.name} reagiu à pressão da Central e testou presença em ${targetDistrict.name}.`,
    bairro: targetDistrict.name,
    districtId: targetDistrict.id,
    factionId: faction.id,
    nivelRisco: Math.min(5, Math.max(3, Math.round(faction.threatLevel / 22))),
    dificuldade: clamp(54 + Math.round(risk * 0.32) + Math.round(targetDistrict.dangerLevel * 0.12), 40, 92),
    requisitosPrincipais: faction.tags.includes("boato") ? ["investigacao", "carisma"] : faction.tags.includes("energia") ? ["controle", "investigacao"] : ["controle", "mobilidade"],
    tags: [...new Set(["faccao", "retaliacao", ...faction.tags.slice(0, 3), ...targetDistrict.tags.slice(0, 2)])],
    limiteTempoNarrativo: "90 minutos",
    isFactionEvent: true,
  };
};

export const applyDailyFactionTick = (factions, districts, day = 1) => {
  const factionEvents = [];
  const nextFactions = factions.map((faction) => {
    const unstableTerritories = faction.territories
      .map((id) => getDistrictById(districts, id))
      .filter((district) => district && district.stability < 45).length;
    const risk = calculateFactionRetaliationRisk(faction);
    const shouldRetaliate = risk >= 58 && day % 2 === 0 && faction.status !== "desmantelada";
    const event = shouldRetaliate ? generateFactionEvent(faction, districts, day) : null;
    if (event) factionEvents.push(event);

    const next = {
      ...faction,
      resources: clamp(faction.resources + (unstableTerritories > 0 ? 2 : 1) - (faction.heat > 75 ? 2 : 0)),
      threatLevel: clamp(faction.threatLevel + unstableTerritories - (faction.heat > 82 ? 1 : 0)),
      heat: clamp(faction.heat - (event ? 12 : 2)),
      recentEvents: event
        ? [{ day, title: event.titulo, result: "retaliação gerada", districtId: event.districtId }, ...(faction.recentEvents ?? [])].slice(0, 8)
        : faction.recentEvents ?? [],
    };

    return { ...next, status: checkFactionStatus(next) };
  });

  return { factions: nextFactions, factionEvents: factionEvents.slice(0, 1) };
};

export const changeFactionInfluenceInDistrict = (districts, factionId, districtId, amount) =>
  districts.map((district) => {
    if (district.id !== districtId) return district;
    const influence = district.activeFactionInfluence ?? {};
    return {
      ...district,
      activeFactionInfluence: {
        ...influence,
        [factionId]: clamp((influence[factionId] ?? 0) + amount),
      },
    };
  });
