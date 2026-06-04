export const initialPlayByPlayStats = () => ({
  generated: 0,
  fallbackUsed: 0,
  eventVariantUsed: 0,
  assembledUsed: 0,
});

export function migrateSaveTo090(save) {
  if (!save) return null;

  return {
    ...save,
    version: save.version ?? "0.9.5-alpha Missões Cinematográficas",
    saveVersion: save.saveVersion ?? "0.9.5",
    recentPlayByPlay: save.recentPlayByPlay ?? [],
    playByPlayStats: {
      ...initialPlayByPlayStats(),
      ...(save.playByPlayStats ?? {}),
    },
  };
}
