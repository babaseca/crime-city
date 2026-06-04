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

export const pairKey = (firstId, secondId) => [firstId, secondId].sort().join("__");

export const clampRelationship = (value) => Math.max(-100, Math.min(100, Math.round(value)));

export const buildInitialRelationships = (heroes) => {
  const relationships = {};

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

      relationships[pairKey(first.id, second.id)] = clampRelationship(base);
    }
  }

  return relationships;
};

export const relationshipValue = (relationships, firstId, secondId) =>
  relationships[pairKey(firstId, secondId)] ?? 0;

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
