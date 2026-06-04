import approaches from "../data/interrogationApproaches.json";
import { normalizeVillainLifecycle } from "./villainLifecycleSystem";

export const performInterrogation = (gameState, villainId, approachId = "tecnica") => {
  const approach = approaches.find((candidate) => candidate.id === approachId) ?? approaches[0];
  const villain = gameState.villains.find((candidate) => candidate.id === villainId);
  if (!villain) return { state: gameState, message: "Dossiê não encontrado." };
  const dispatcherScore = gameState.dispatcher?.attributes?.[approach.attribute] ?? 5;
  const normalized = normalizeVillainLifecycle(villain);
  const chance = Math.max(8, Math.min(94, 35 + approach.truthBonus + dispatcherScore * 4 - (normalized.grudgeAgainstCentral ?? 20) * 0.2));
  const success = (gameState.day * 17 + villain.id.length * 11 + approach.id.length) % 100 < chance;
  const clue = success ? `pista-${villain.id}-${gameState.day}` : null;
  return {
    state: {
      ...gameState,
      discoveredClues: clue ? [...new Set([...(gameState.discoveredClues ?? []), clue])] : gameState.discoveredClues,
      villains: gameState.villains.map((record) =>
        record.id === villainId
          ? {
              ...normalized,
              grudgeAgainstCentral: Math.max(0, Math.min(100, normalized.grudgeAgainstCentral + approach.grudgeChange)),
              historicoEncontros: [
                ...(normalized.historicoEncontros ?? []),
                {
                  day: gameState.day,
                  eventTitle: `Interrogatório ${approach.label}`,
                  result: success ? "pista verdadeira" : "resposta evasiva",
                  heroes: [],
                },
              ],
            }
          : record,
      ),
    },
    message: success ? `${villain.alcunha} entregou uma pista útil.` : `${villain.alcunha} resistiu à abordagem.`,
  };
};
