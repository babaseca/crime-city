import { relationshipSeeds } from "../data/heroPersonalities";
import { alphaPackageRelationshipSeeds } from "../data/alpha11_12/packageAdapters";

const opposingTraits = new Map([
  ["impulsiva", "cautelosa"],
  ["ousada", "cautelosa"],
  ["competitiva", "pacificador"],
  ["orgulhosa", "humilde"],
  ["solitaria", "sociavel"],
  ["reservado", "eloquente"],
  ["reservada", "brincalhao"],
  ["ansioso", "calmo"],
  ["teimoso", "pragmatico"],
]);

const hashText = (text) =>
  [...text].reduce((value, char, index) => value + char.charCodeAt(0) * (index + 3), 0);

export const pairKey = (firstId, secondId) => `${firstId}__${secondId}`;

export const legacyPairKey = (firstId, secondId) => [firstId, secondId].sort().join("__");

export const clampRelationship = (value) => Math.max(-100, Math.min(100, Math.round(value)));

const clampAxis = (value) => Math.max(0, Math.min(100, Math.round(value)));

export const relationshipScore = (profile) => {
  if (typeof profile === "number") return clampRelationship(profile);
  if (!profile) return 0;

  return clampRelationship(
    (profile.trust ?? 50) * 0.34 +
      (profile.respect ?? 50) * 0.28 +
      (profile.closeness ?? 50) * 0.24 -
      (profile.tension ?? 0) * 0.42 +
      (profile.operationalSynergy ?? 0) * 0.08 +
      (profile.ideologicalAlignment ?? 0) * 0.04 +
      (profile.debt ?? 0) * 0.03 -
      (profile.resentment ?? 0) * 0.05 -
      (profile.fear ?? 0) * 0.04 -
      28,
  );
};

export const createRelationshipProfile = (score = 0, overrides = {}, fromHeroId = null, toHeroId = null) => {
  const base = clampRelationship(score);
  const trust = clampAxis(50 + base * 0.55);
  const respect = clampAxis(54 + base * 0.42);
  const closeness = clampAxis(42 + base * 0.36);
  const tension = clampAxis(base < 0 ? 24 + Math.abs(base) * 0.62 : Math.max(4, 20 - base * 0.22));

  return {
    fromHeroId,
    toHeroId,
    trust,
    respect,
    closeness,
    tension,
    flags: [],
    ...overrides,
  };
};

export const relationshipProfile = (relationships, firstId, secondId) => {
  const directKey = pairKey(firstId, secondId);
  const legacyKey = legacyPairKey(firstId, secondId);
  const reverseKey = pairKey(secondId, firstId);
  const current = relationships?.[directKey] ?? relationships?.[legacyKey] ?? relationships?.[reverseKey];
  const profile = typeof current === "number" ? createRelationshipProfile(current, {}, firstId, secondId) : current ?? createRelationshipProfile(0, {}, firstId, secondId);

  return {
    ...profile,
    fromHeroId: profile.fromHeroId ?? firstId,
    toHeroId: profile.toHeroId ?? secondId,
  };
};

export const adjustRelationshipProfile = (profile, delta = 0, axisDeltas = {}) => {
  const current = typeof profile === "number" ? createRelationshipProfile(profile) : profile ?? createRelationshipProfile(0);

  return {
    ...current,
    trust: clampAxis((current.trust ?? 50) + delta * 0.7 + (axisDeltas.trust ?? 0)),
    respect: clampAxis((current.respect ?? 50) + delta * 0.5 + (axisDeltas.respect ?? 0)),
    closeness: clampAxis((current.closeness ?? 50) + delta * 0.45 + (axisDeltas.closeness ?? 0)),
    tension: clampAxis((current.tension ?? 0) + (delta < 0 ? Math.abs(delta) * 0.8 : -delta * 0.35) + (axisDeltas.tension ?? 0)),
    flags: [...new Set([...(current.flags ?? []), ...(axisDeltas.flags ?? [])])],
  };
};

export const buildInitialRelationships = (heroes) => {
  const relationships = {};
  const allSeeds = { ...relationshipSeeds, ...alphaPackageRelationshipSeeds };

  for (let i = 0; i < heroes.length; i += 1) {
    for (let j = i + 1; j < heroes.length; j += 1) {
      const first = heroes[i];
      const second = heroes[j];
      const sharedTraits = first.tracos.filter((trait) => second.tracos.includes(trait)).length;
      const opposedTraits =
        first.tracos.some((trait) => second.tracos.includes(opposingTraits.get(trait))) ||
        second.tracos.some((trait) => first.tracos.includes(opposingTraits.get(trait)));
      const texture = (hashText(`${first.id}:${second.id}`) % 17) - 8;
      const base = sharedTraits * 8 - (opposedTraits ? 10 : 0) + texture;

      const forwardKey = pairKey(first.id, second.id);
      const reverseKey = pairKey(second.id, first.id);
      const legacyKey = legacyPairKey(first.id, second.id);
      relationships[forwardKey] = createRelationshipProfile(base, allSeeds[forwardKey] ?? allSeeds[legacyKey] ?? {}, first.id, second.id);
      relationships[reverseKey] = createRelationshipProfile(base, allSeeds[reverseKey] ?? allSeeds[legacyKey] ?? {}, second.id, first.id);
    }
  }

  return relationships;
};

export const normalizeRelationships = (relationships = {}, heroes = []) => {
  const initial = buildInitialRelationships(heroes);

  return Object.entries(initial).reduce((normalized, [key, initialProfile]) => {
    const [fromHeroId, toHeroId] = key.split("__");
    const current = relationships[key] ?? relationships[legacyPairKey(fromHeroId, toHeroId)];
    if (current === undefined) {
      normalized[key] = initialProfile;
      return normalized;
    }

    normalized[key] =
      typeof current === "number"
        ? createRelationshipProfile(current, { flags: initialProfile.flags ?? [] }, fromHeroId, toHeroId)
        : {
            ...initialProfile,
            ...current,
            fromHeroId,
            toHeroId,
            flags: [...new Set([...(initialProfile.flags ?? []), ...(current.flags ?? [])])],
          };
    return normalized;
  }, {});
};

export const relationshipValue = (relationships, firstId, secondId) =>
  relationshipScore(relationshipProfile(relationships, firstId, secondId));

export const relationshipLabel = (value) => {
  if (value >= 75) return "dupla lendária";
  if (value >= 45) return "parceria forte";
  if (value >= 18) return "confiança";
  if (value >= 4) return "boa sintonia";
  if (value > -8) return "neutro";
  if (value > -35) return "atrito";
  if (value > -65) return "rivalidade";
  return "conflito aberto";
};

export const relationshipCondition = (value) => {
  if (value >= 35) return "positive";
  if (value <= -18) return "negative";
  return "neutral";
};

export const relationTone = (value) => {
  if (value >= 18) return "positive";
  if (value <= -12) return "negative";
  return "neutral";
};

export const averageTeamRelationship = (team, relationships) => {
  if (team.length < 2) return 0;

  let total = 0;
  let pairs = 0;

  for (let i = 0; i < team.length; i += 1) {
    for (let j = i + 1; j < team.length; j += 1) {
      total += relationshipValue(relationships, team[i].id, team[j].id);
      pairs += 1;
    }
  }

  return total / pairs;
};
