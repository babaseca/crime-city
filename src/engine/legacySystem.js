export const initializeCityLegacy = () => ({
  heroesMortos: [],
  bairrosSalvos: [],
  bairrosColapsados: [],
  viloesReformados: [],
  viloesFugitivos: [],
  faccoesDesmanteladas: [],
  grandesCrisesVencidas: [],
  escandalos: [],
  feitosHeroicos: [],
  decisoesControversas: [],
});

export const recordLegacyEvent = (gameState, event) => ({
  ...gameState,
  cityLegacy: {
    ...(gameState.cityLegacy ?? initializeCityLegacy()),
    [event.category]: [event, ...((gameState.cityLegacy ?? initializeCityLegacy())[event.category] ?? [])].slice(0, 40),
  },
});

export const recordLegacyFromMission = (gameState, mission) => {
  let next = gameState;
  if (mission.deaths?.length) {
    mission.deaths.forEach((death) => {
      next = recordLegacyEvent(next, { category: "heroesMortos", day: mission.day, text: `${death.codinome} morreu em ${death.finalMission}.`, heroId: death.heroId });
    });
  }
  if (mission.capturedVillain) {
    next = recordLegacyEvent(next, { category: "feitosHeroicos", day: mission.day, text: `${mission.capturedVillain.alcunha} foi capturado em ${mission.event.bairro}.` });
  }
  if (mission.success && mission.civiliansSaved >= 35) {
    next = recordLegacyEvent(next, { category: "feitosHeroicos", day: mission.day, text: `${mission.heroNames.join(", ")} salvaram ${mission.civiliansSaved} civis em ${mission.event.bairro}.` });
  }
  if (!mission.success && ["alto", "severo"].includes(mission.materialDamage)) {
    next = recordLegacyEvent(next, { category: "decisoesControversas", day: mission.day, text: `Falha com dano ${mission.materialDamage} em ${mission.event.bairro}.` });
  }
  (mission.legacySeeds ?? mission.playByPlay?.seeds?.legacySeeds ?? []).forEach((seed) => {
    next = recordLegacyEvent(next, { category: "feitosHeroicos", day: mission.day, text: seed });
  });
  return next;
};

export const getCampaignLegacySummary = (gameState) => {
  const legacy = gameState.cityLegacy ?? initializeCityLegacy();
  return {
    heroesMortos: legacy.heroesMortos.length,
    feitosHeroicos: legacy.feitosHeroicos.length,
    decisoesControversas: legacy.decisoesControversas.length,
    viloesReformados: legacy.viloesReformados.length,
  };
};

export const generateLegacyHeadline = (gameState) => {
  const legacy = gameState.cityLegacy ?? initializeCityLegacy();
  if (legacy.heroesMortos.length) return legacy.heroesMortos[0].text;
  if (legacy.feitosHeroicos.length) return legacy.feitosHeroicos[0].text;
  return "Nova Aurora ainda está escrevendo a memória deste plantão.";
};
