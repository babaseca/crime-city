import { alpha100Events as rawAlpha100Events } from "./events_500";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeTag = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const safeArray = (value) => (Array.isArray(value) ? value : []);

export const normalizeAlpha100Event = (event) => {
  const villain = event.vilao ?? null;
  const factionName = event.faccao ?? null;
  const categoryTags = [event.categoria, event.riscoLabel, event.riscoCivil, event.riscoDanoColateral].filter(Boolean).map(normalizeTag);
  const objectiveTags = [...safeArray(event.objetivosPrimarios), ...safeArray(event.objetivosSecundarios)].map(normalizeTag);

  return {
    ...event,
    source: "alpha100",
    alpha100: true,
    bairro: event.bairro,
    districtId: event.districtId,
    faccao: factionName,
    factionId: event.factionId,
    vilao: villain,
    villainId: event.villainId ?? villain?.id ?? null,
    villainName: villain?.alcunha ?? villain?.nome ?? null,
    nivelRisco: clamp(Number(event.nivelRisco ?? 3), 1, 5),
    dificuldade: clamp(Number(event.dificuldade ?? 60), 24, 98),
    requisitosPrincipais: safeArray(event.requisitosPrincipais),
    papeisRecomendados: safeArray(event.papeisRecomendados),
    tags: [
      ...new Set([
        ...safeArray(event.tags),
        ...categoryTags,
        ...objectiveTags.slice(0, 4),
        event.districtId,
        event.factionId,
        event.villainId ?? villain?.id,
      ].filter(Boolean)),
    ],
    limiteTempoNarrativo: event.limiteTempoNarrativo ?? "60 minutos",
    playByPlayVariantIds: safeArray(event.playByPlayVariantIds),
    newspaperSeeds: safeArray(event.newspaperSeeds),
    socialSeeds: safeArray(event.socialSeeds),
  };
};

export const alpha100Events = rawAlpha100Events.map(normalizeAlpha100Event);

export const alpha100EventById = new Map(alpha100Events.map((event) => [event.id, event]));
