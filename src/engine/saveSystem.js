const SAVE_KEY = "central-de-crise-herois-de-plantao:v9";
const LEGACY_KEYS = ["central-de-crise-herois-de-plantao:v8", "central-de-crise-herois-de-plantao:v7", "central-de-crise-herois-de-plantao:v5", "central-de-crise-herois-de-plantao:v4", "central-de-crise-herois-de-plantao:v2"];

export const saveGame = (state) => {
  if (typeof localStorage === "undefined" || !state) return;

  localStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      saveVersion: state.saveVersion ?? "0.9.5",
      savedAt: new Date().toISOString(),
      state: {
        ...state,
        saveVersion: state.saveVersion ?? "0.9.5",
      },
    }),
  );
};

export const loadGame = () => {
  if (typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(SAVE_KEY) ?? LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (!raw) return null;
    return JSON.parse(raw).state ?? null;
  } catch {
    return null;
  }
};

export const hasSavedGame = () => Boolean(loadGame());

export const clearSavedGame = () => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(SAVE_KEY);
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const resetGame = (createInitialGameState) => {
  clearSavedGame();
  return createInitialGameState();
};
