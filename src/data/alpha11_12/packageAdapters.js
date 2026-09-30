import heroesSeed from "./alpha_1_1/heroes.json";
import villainsSeed from "./alpha_1_1/villains.json";
import relationshipSeed from "./alpha_1_1/relationship_graph_seed.json";
import caseSeed from "./alpha_1_2/new_game_case_seed.json";
import constants from "./shared/constants.json";

const alphaRolesToFunction = (roles = []) => roles.join(" / ");

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(Number(value) || 0)));

const normalizeTextId = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const portraitSvg = ({ initialsText, danger = 3, role = "hero" }) => {
  const hue = role === "villain" ? 350 - danger * 12 : 188 + danger * 8;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect width="240" height="240" rx="28" fill="#07111b"/>
      <circle cx="120" cy="98" r="70" fill="hsl(${hue} 76% 28%)" opacity=".84"/>
      <path d="M0 172c46-38 92-48 138-28s78 12 102 2v94H0z" fill="hsl(${hue + 24} 72% 18%)"/>
      <text x="120" y="132" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="900" fill="#e8fbff">${initialsText}</text>
      <path d="M74 166h92" stroke="hsl(${hue + 58} 92% 62%)" stroke-width="7" stroke-linecap="round"/>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const alphaPackageVersion = constants.version;
export const alphaPackageHeroProfiles = heroesSeed.heroes;
export const alphaPackageVillainProfiles = villainsSeed.villains;
export const alphaPackageCaseSeeds = caseSeed.cases;
export const alphaPackageHeroIds = alphaPackageHeroProfiles.map((hero) => hero.id);
export const alphaPackageVillainIds = alphaPackageVillainProfiles.map((villain) => villain.id);

export const legacyAlphaHeroAlias = {
  "h-aurora-vetor": "HERO_003",
  "h-bruma-livre": "HERO_005",
  "h-cifra-rasa": "HERO_004",
  "h-domo-prata": "HERO_002",
  "h-eco-mandarim": "HERO_006",
  "h-faisca-norte": "HERO_007",
  "h-geodo-vivo": "HERO_002",
  "h-horizonte-lince": "HERO_008",
};

const packageMoralToCurrent = (axes = {}) => ({
  authorityRespect: clamp((axes.ruleOfLaw ?? 50) * 0.72 + (axes.truthTransparency ?? 50) * 0.28),
  lethalForceTolerance: clamp(100 - (axes.preservationOfLife ?? 50)),
  collateralTolerance: clamp(100 - (axes.proportionality ?? 50)),
  civilianPriority: clamp((axes.preservationOfLife ?? 50) * 0.78 + (axes.autonomy ?? 50) * 0.22),
  villainReformSupport: clamp(axes.redemption ?? 50),
  publicExposureComfort: clamp((axes.truthTransparency ?? 50) * 0.68 + (axes.ruleOfLaw ?? 50) * 0.32),
  disobedienceThreshold: clamp(100 - (axes.ruleOfLaw ?? 50) * 0.45 + (axes.autonomy ?? 50) * 0.45),
  preservationOfLife: clamp(axes.preservationOfLife ?? 50),
  ruleOfLaw: clamp(axes.ruleOfLaw ?? 50),
  truthTransparency: clamp(axes.truthTransparency ?? 50),
  loyalty: clamp(axes.loyalty ?? 50),
  proportionality: clamp(axes.proportionality ?? 50),
  autonomy: clamp(axes.autonomy ?? 50),
  redemption: clamp(axes.redemption ?? 50),
  collectiveGood: clamp(axes.collectiveGood ?? 50),
});

const attributesForHero = (hero) => {
  const facets = hero.personality?.facets ?? {};
  const roles = hero.role ?? [];
  return {
    forca: roles.some((role) => /tanque|prote/i.test(role)) ? 8 : 5,
    mobilidade: roles.some((role) => /mobilidade|infiltra|resgate rápido/i.test(role)) ? 9 : 5,
    controle: roles.some((role) => /controle|suporte|estrat/i.test(role)) ? 8 : 6,
    investigacao: roles.some((role) => /intelig|estrat|guerra/i.test(role)) ? 9 : 5,
    carisma: roles.some((role) => /comunica|negocia|relações/i.test(role)) ? 9 : Math.max(4, Math.round((facets.assertiveness ?? 50) / 12)),
    resistencia: roles.some((role) => /tanque|conten/i.test(role)) ? 9 : Math.max(4, Math.round((facets.resilience ?? 58) / 10)),
  };
};

export const adaptAlphaHero = (hero) => {
  const fears = hero.personality?.fears ?? [];
  const needs = hero.personality?.needs ?? [];
  const blindspots = hero.personality?.blindspots ?? [];
  const powerLimits = hero.powerLimits ?? [];
  return {
    id: hero.id,
    codinome: hero.codename,
    nomeCivil: hero.civilianName,
    idade: hero.age,
    pronouns: hero.pronouns,
    imageUrl: portraitSvg({ initialsText: initials(hero.codename), danger: 2, role: "hero" }),
    funcao: alphaRolesToFunction(hero.role),
    poder: hero.powerSummary,
    bio: hero.background,
    atributos: attributesForHero(hero),
    tracos: [
      hero.personality?.conflictStyle,
      hero.personality?.copingStyle,
      ...(hero.personality?.values ?? []).slice(0, 3),
    ].filter(Boolean).map(normalizeTextId),
    moralProfile: packageMoralToCurrent(hero.moralProfile?.axes),
    alphaCharacterProfile: hero,
    dynamicState: {
      stress: hero.baselineState?.stress ?? 12,
      morale: hero.baselineState?.morale ?? 72,
      fatigue: hero.baselineState?.fatigue ?? 0,
      trustInCommand: hero.baselineState?.trustInCommand ?? 60,
      publicPressure: hero.baselineState?.publicPressure ?? 20,
      unresolvedTrauma: hero.baselineState?.unresolvedTrauma ?? 0,
    },
    coreFear: fears[0] ?? "Falhar com a equipe.",
    coreDesire: needs[0] ?? "Ser útil sem se perder.",
    personalFlaw: blindspots[0] ?? "Compensa insegurança com controle.",
    hardLine: hero.moralProfile?.redLines?.[0] ?? powerLimits[0] ?? "Não aceita dano evitável a civis.",
    reasonToStay: hero.arcHooks?.[0] ?? "A Central ainda oferece um jeito responsável de agir.",
    shortDescription: hero.powerSummary,
    powersSpecialty: hero.powerSummary,
    operationalWeakness: powerLimits[0] ?? "Pode passar do limite sob estresse.",
    energia: 92,
    estresse: hero.baselineState?.stress ?? 10,
    moral: hero.baselineState?.morale ?? 72,
    experiencia: 0,
    teamStatus: "active_team",
    rosterStatus: "active_team",
    scheduleStatus: "on_duty",
    status: "disponivel",
    isAlphaActive: true,
    alpha11Focus: true,
    alphaPackageVersion,
    isPackageAlpha: true,
  };
};

export const adaptAlphaVillain = (villain) => {
  const custody = villain.custodyProfile ?? {};
  const rehab = villain.rehabilitationProfile ?? {};
  const interrogation = villain.interrogationProfile ?? {};
  return {
    id: villain.id,
    alcunha: villain.codename,
    nome: villain.civilianName,
    nomeCivil: villain.civilianName,
    idade: villain.age,
    pronouns: villain.pronouns,
    imageUrl: portraitSvg({ initialsText: initials(villain.codename), danger: villain.threatTier, role: "villain" }),
    periculosidade: villain.threatTier,
    threatLevel: clamp(villain.threatTier * 18, 1, 100),
    faccao: villain.factions?.[0] ?? "Sem facção confirmada",
    associatedFactionId: villain.factions?.[0] ?? null,
    poderesRecursos: villain.powerSummary,
    crimesConhecidos: villain.criminalPattern ?? [],
    personalidade: [
      villain.personality?.conflictStyle,
      ...(villain.personality?.values ?? []),
      ...(villain.personality?.blindspots ?? []),
    ].filter(Boolean),
    background: villain.background,
    moralProfile: packageMoralToCurrent(villain.moralProfile?.axes),
    alphaCharacterProfile: villain,
    interrogationProfile: interrogation,
    custodyProfile: custody,
    rehabilitationProfile: rehab,
    estadoAtual: "fugitivo",
    status: "fugitivo",
    visibility: "fugitivo",
    riscoFuga: clamp(custody.escapeRisk ?? villain.threatTier * 16),
    chanceReforma: clamp(rehab.basePotential ?? villain.moralProfile?.axes?.redemption ?? 35),
    reformProgress: 0,
    grudgeAgainstCentral: clamp((100 - (villain.moralProfile?.axes?.ruleOfLaw ?? 40)) * 0.6),
    prisonSecurityLevel: null,
    informante: false,
    informantStatus: "nenhum",
    historicoEncontros: [],
    activeCaseId: `CASE_${villain.id.split("_").at(-1)}`,
    isAlphaActiveVillain: true,
    spawnEnabled: true,
    alphaPackageVersion,
    isPackageAlpha: true,
  };
};

const adaptRelationshipEdge = (edge) => {
  const axes = edge.axes ?? {};
  return {
    fromHeroId: edge.fromCharacterId,
    toHeroId: edge.toCharacterId,
    trust: axes.trust ?? 50,
    respect: axes.respect ?? 50,
    closeness: Math.round(((axes.affection ?? 0) + (axes.intimacy ?? 0)) / 2),
    tension: Math.max(0, Math.round(((axes.resentment ?? 0) + (axes.rivalry ?? 0) + (axes.fear ?? 0) * 0.6) / 2.6)),
    affection: axes.affection ?? 0,
    fear: axes.fear ?? 0,
    resentment: axes.resentment ?? 0,
    rivalry: axes.rivalry ?? 0,
    dependence: axes.dependence ?? 0,
    ideologicalAlignment: axes.ideologicalAlignment ?? 0,
    operationalSynergy: axes.operationalSynergy ?? 0,
    intimacy: axes.intimacy ?? 0,
    debt: axes.debt ?? 0,
    state: edge.state,
    memories: edge.memories ?? [],
    boundaries: edge.boundaries ?? [],
    unresolvedIssues: edge.unresolvedIssues ?? [],
    flags: [...new Set([edge.state, ...(edge.memories ?? []).flatMap((memory) => memory.tags ?? [])].filter(Boolean))],
    lastUpdatedTick: edge.lastUpdatedTick ?? 0,
  };
};

export const alphaPackageRelationshipSeeds = Object.fromEntries(
  relationshipSeed.edges.map((edge) => [`${edge.fromCharacterId}__${edge.toCharacterId}`, adaptRelationshipEdge(edge)]),
);

export const alphaPackageHeroes = alphaPackageHeroProfiles.map(adaptAlphaHero);
export const alphaPackageVillains = alphaPackageVillainProfiles.map(adaptAlphaVillain);

export const alphaPackageCaseRecords = alphaPackageCaseSeeds.map((record) => ({
  ...record,
  alphaPackageVersion,
}));
