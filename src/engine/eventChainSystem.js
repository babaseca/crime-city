import eventChains from "../data/eventChains.json";
import { clamp, getDistrictById } from "./districtSystem";

export const initializeEventChains = () => ({
  activeEventChains: [],
  completedEventChains: [],
  discoveredClues: [],
});

export const getChainById = (chainId) => eventChains.find((chain) => chain.id === chainId) ?? null;

const makeChainState = (chain, stage = 1, day = 1) => ({
  chainId: chain.id,
  stage,
  factionId: chain.factionId,
  districtIds: chain.districtIds,
  discoveredDay: day,
});

export const discoverChainsFromMission = (state, mission) => {
  const tags = mission.event.tags ?? [];
  const existing = new Set([...(state.activeEventChains ?? []).map((entry) => entry.chainId), ...(state.completedEventChains ?? [])]);
  const discovered = eventChains.find((chain) => !existing.has(chain.id) && chain.triggerTags.some((tag) => tags.includes(tag)));
  if (!discovered || (!mission.success && Math.random() > 0.34)) return state;

  return {
    ...state,
    activeEventChains: [makeChainState(discovered, 1, mission.day), ...(state.activeEventChains ?? [])].slice(0, 8),
    discoveredClues: [
      {
        id: `clue-${discovered.id}-${mission.day}`,
        day: mission.day,
        chainId: discovered.id,
        text: `Pista aberta em ${mission.event.bairro}: ${discovered.name}`,
      },
      ...(state.discoveredClues ?? []),
    ].slice(0, 30),
  };
};

export const advanceEventChainsAfterMission = (state, mission) => {
  let nextState = discoverChainsFromMission(state, mission);
  const chainId = mission.event.chainId;
  if (!chainId) return nextState;

  const chain = getChainById(chainId);
  const current = (nextState.activeEventChains ?? []).find((entry) => entry.chainId === chainId);
  const stage = chain?.stages.find((item) => item.stage === (mission.event.chainStage ?? current?.stage));
  if (!chain || !stage) return nextState;

  const nextStage = mission.success ? stage.nextOnSuccess : stage.nextOnFailure ?? stage.nextOnSuccess;
  if (stage.isFinale || !nextStage) {
    return {
      ...nextState,
      activeEventChains: nextState.activeEventChains.filter((entry) => entry.chainId !== chainId),
      completedEventChains: [...new Set([chainId, ...(nextState.completedEventChains ?? [])])],
      discoveredClues: [
        { id: `clue-finale-${chainId}-${mission.day}`, day: mission.day, chainId, text: `${chain.name} chegou ao fechamento operacional.` },
        ...(nextState.discoveredClues ?? []),
      ].slice(0, 30),
    };
  }

  return {
    ...nextState,
    activeEventChains: [
      makeChainState(chain, nextStage, mission.day),
      ...nextState.activeEventChains.filter((entry) => entry.chainId !== chainId),
    ].slice(0, 8),
  };
};

export const generateChainEvents = (activeEventChains = [], districts = [], day = 1) =>
  activeEventChains.slice(0, 2).map((entry) => {
    const chain = getChainById(entry.chainId);
    const stage = chain?.stages.find((item) => item.stage === entry.stage);
    const district = entry.districtIds.map((id) => getDistrictById(districts, id)).filter(Boolean).sort((a, b) => b.dangerLevel - a.dangerLevel)[0];
    if (!chain || !stage || !district) return null;
    return {
      id: `chain-${chain.id}-${entry.stage}-${day}`,
      titulo: `${stage.title} em ${district.name}`,
      descricao: `${chain.description} A pista atual aponta para ${district.name}.`,
      bairro: district.name,
      districtId: district.id,
      factionId: chain.factionId,
      chainId: chain.id,
      chainStage: entry.stage,
      nivelRisco: stage.isFinale ? 5 : clamp(2 + entry.stage, 2, 5),
      dificuldade: clamp(48 + entry.stage * 9 + Math.round(district.dangerLevel * 0.16), 42, 94),
      requisitosPrincipais: stage.tags.includes("investigacao") || stage.tags.includes("dados") ? ["investigacao", "carisma"] : ["controle", "mobilidade"],
      tags: [...new Set(["cadeia", ...stage.tags, ...district.tags.slice(0, 2)])],
      limiteTempoNarrativo: stage.isFinale ? "duas horas" : "90 minutos",
      isFactionEvent: true,
      isChainEvent: true,
    };
  }).filter(Boolean);
