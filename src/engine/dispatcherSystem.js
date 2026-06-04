import backgrounds from "../data/dispatcherBackgrounds.json";
import dispatcherPerks from "../data/dispatcherPerks.json";
import personalities from "../data/dispatcherPersonalities.json";

export const dispatcherAttributeLabels = {
  lideranca: "Liderança",
  logistica: "Logística",
  empatia: "Empatia",
  tatica: "Tática",
  relacoesPublicas: "Relações Públicas",
  sangueFrio: "Sangue-frio",
  administracao: "Administração",
  intuicao: "Intuição",
};

const baseAttributes = {
  lideranca: 4,
  logistica: 4,
  empatia: 4,
  tatica: 4,
  relacoesPublicas: 4,
  sangueFrio: 4,
  administracao: 4,
  intuicao: 4,
};

const addAttributes = (first, second = {}) =>
  Object.fromEntries(
    Object.keys(baseAttributes).map((key) => [key, Math.max(1, Math.min(12, (first[key] ?? 0) + (second[key] ?? 0)))]),
  );

const avatarSvg = (initials) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect width="240" height="240" rx="34" fill="#081820"/>
      <path d="M24 172c52-42 116-48 192-18v62H24z" fill="#0e7490"/>
      <circle cx="120" cy="92" r="48" fill="#164e63"/>
      <text x="120" y="112" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="800" fill="#ecfeff">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const dispatcherBackgrounds = backgrounds;
export const dispatcherPersonalities = personalities;

export const createDispatcher = ({ name, callsign, pronoun, backgroundId, personalityId }) => {
  const background = backgrounds.find((item) => item.id === backgroundId) ?? backgrounds[0];
  const personality = personalities.find((item) => item.id === personalityId) ?? personalities[0];
  const initials = (callsign || name || "DX")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return {
    id: `dispatcher-${Date.now()}`,
    name: name || "Coordenador sem nome",
    callsign: callsign || "Central",
    pronoun: pronoun || "",
    imageUrl: avatarSvg(initials),
    backgroundId: background.id,
    backgroundTitle: background.title,
    personalityId: personality.id,
    personalityTitle: personality.title,
    leadershipStyle: personality.title,
    startingAbility: personality.startingAbility,
    abilities: [personality.startingAbility],
    attributes: addAttributes(addAttributes(baseAttributes, background.attributes), personality.attributes),
    level: 1,
    xp: 0,
    nextLevelXp: 120,
    pendingUpgrades: 0,
    upgrades: [],
  };
};

export const dispatcherChanceModifier = (dispatcher, event, team) => {
  if (!dispatcher) return 0;

  const attrs = dispatcher.attributes;
  let modifier = 0;
  const requirementFit =
    team.length > 0
      ? event.requisitosPrincipais.reduce((sum, attr) => sum + Math.max(...team.map((hero) => hero.atributos[attr] ?? 0)), 0) /
        event.requisitosPrincipais.length
      : 0;

  modifier += Math.max(0, requirementFit - 6) * (attrs.tatica ?? 0) * 0.22;
  if (event.tags.includes("tempo_curto") || /minutos/.test(event.limiteTempoNarrativo)) modifier += (attrs.logistica ?? 0) * 0.35;
  if (event.nivelRisco >= 4) modifier += (attrs.sangueFrio ?? 0) * 0.42;
  if (event.tags.includes("multidao") || event.tags.includes("civis")) modifier += (attrs.relacoesPublicas ?? 0) * 0.18;
  if (dispatcher.abilities.includes("Gerente de Crise") && event.nivelRisco >= 4) modifier += 4;
  if (dispatcher.abilities.includes("Plano B, C e Café") && event.requisitosPrincipais.length > 1) modifier += 3;

  return Math.round(modifier);
};

export const dispatcherReputationShield = (dispatcher, reputationDelta) => {
  if (!dispatcher || reputationDelta >= 0) return reputationDelta;
  const reduction = Math.floor((dispatcher.attributes.relacoesPublicas ?? 0) / 4) + (dispatcher.abilities.includes("Controle de Danos") ? 2 : 0);
  return Math.min(-1, reputationDelta + reduction);
};

export const dispatcherBudgetDiscount = (dispatcher, amount) => {
  if (!dispatcher) return amount;
  const reduction = Math.min(0.24, ((dispatcher.attributes.administracao ?? 0) - 4) * 0.018 + (dispatcher.abilities.includes("Corte de Custos") ? 0.08 : 0));
  return Math.round(amount * (1 - Math.max(0, reduction)));
};

export const dispatcherRelationshipBonus = (dispatcher) => {
  if (!dispatcher) return 0;
  return Math.floor((dispatcher.attributes.empatia ?? 0) / 5) + (dispatcher.abilities.includes("Voz no Rádio") ? 1 : 0);
};

export const dispatcherReformBonus = (dispatcher) => {
  if (!dispatcher) return 0;
  return Math.floor((dispatcher.attributes.empatia ?? 0) * 1.2) + (dispatcher.abilities.includes("Segunda Chance") ? 12 : 0);
};

export const grantDispatcherDayXp = (dispatcher, report, reputation) => {
  if (!dispatcher || !report) return dispatcher;

  const xpGain =
    report.resolved.length * 28 +
    Math.floor(report.civiliansSaved / 3) +
    report.villainsCaptured * 18 +
    Math.max(0, reputation - 50) +
    (report.heroesKilled === 0 ? 15 : -20);
  let next = { ...dispatcher, xp: dispatcher.xp + Math.max(10, xpGain) };

  while (next.xp >= next.nextLevelXp) {
    next = {
      ...next,
      xp: next.xp - next.nextLevelXp,
      level: next.level + 1,
      nextLevelXp: Math.round(next.nextLevelXp * 1.35),
      pendingUpgrades: (next.pendingUpgrades ?? 0) + 1,
    };
  }

  return next;
};

export const dispatcherUpgrades = dispatcherPerks.map((perk) => ({
  id: perk.id,
  title: perk.title ?? perk.name,
  ability: perk.ability ?? perk.name,
  attribute: perk.attribute ?? "lideranca",
  description: perk.description,
  effects: perk.effects ?? {},
}));

export const applyDispatcherUpgrade = (dispatcher, upgradeId) => {
  const upgrade = dispatcherUpgrades.find((item) => item.id === upgradeId);
  if (!dispatcher || !upgrade || dispatcher.upgrades.includes(upgrade.id) || dispatcher.pendingUpgrades <= 0) return dispatcher;

  return {
    ...dispatcher,
    pendingUpgrades: dispatcher.pendingUpgrades - 1,
    upgrades: [...dispatcher.upgrades, upgrade.id],
    abilities: dispatcher.abilities.includes(upgrade.ability) ? dispatcher.abilities : [...dispatcher.abilities, upgrade.ability],
    attributes: {
      ...dispatcher.attributes,
      [upgrade.attribute]: Math.min(12, (dispatcher.attributes[upgrade.attribute] ?? 1) + 1),
    },
  };
};
