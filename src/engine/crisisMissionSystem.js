import crisisMissions from "../data/crisisMissions.json";

export const initializeCrisisMissions = () => [];

export const generateCrisisEvent = (gameState) => {
  const arcReady = (gameState.seasonArcs ?? []).some((arc) => arc.status === "finale_ready");
  const criticalDistrict = (gameState.districts ?? []).find((district) => district.stability < 25 || district.dangerLevel > 82);
  if (!arcReady && !criticalDistrict) return null;
  if ((gameState.day + (criticalDistrict?.id.length ?? 0)) % 5 !== 0) return null;
  const crisis = crisisMissions[0];
  const district = criticalDistrict ?? (gameState.districts ?? []).find((item) => item.id === crisis.districtId);
  return {
    id: `${crisis.id}-${gameState.day}`,
    titulo: crisis.title,
    descricao: `Crise multi-etapa: ${crisis.stages.map((stage) => stage.label).join(", ")}.`,
    bairro: district?.name ?? "Estação Norte",
    districtId: district?.id ?? crisis.districtId,
    factionId: crisis.factionId,
    nivelRisco: 5,
    dificuldade: 88,
    requisitosPrincipais: ["investigacao", "mobilidade", "controle"],
    tags: ["grande_crise", "multi_etapa", "energia", "civis"],
    limiteTempoNarrativo: "várias frentes simultâneas",
    crisisMissionId: crisis.id,
    isDistrictCrisis: true,
  };
};

export const startCrisisMission = (gameState, crisisEvent) => ({
  ...gameState,
  crisisMissions: [
    {
      id: crisisEvent.crisisMissionId,
      eventId: crisisEvent.id,
      day: gameState.day,
      status: "active",
      stage: 1,
    },
    ...(gameState.crisisMissions ?? []),
  ],
});
