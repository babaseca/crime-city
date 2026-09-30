export const POOL_VERSION_095 = "alpha095-expansion-pack";

export function migrateSaveTo095(save) {
  if (!save) return null;

  return {
    ...save,
    version: save.version ?? "0.9.5-alpha Missões Cinematográficas",
    saveVersion: "0.9.5",
    knownVillainIds: save.knownVillainIds ?? save.knownVillains ?? [],
    heroPoolVersion: save.heroPoolVersion ?? POOL_VERSION_095,
    villainPoolVersion: save.villainPoolVersion ?? POOL_VERSION_095,
    recruitmentRotationState: save.recruitmentRotationState ?? { day: 0, candidateIds: [] },
    balanceConfigVersion: save.balanceConfigVersion ?? "0.9.5",
  };
}
