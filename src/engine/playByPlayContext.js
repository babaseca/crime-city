const resultLabels = {
  sucesso_exemplar: "resolução exemplar",
  sucesso_com_dano: "sucesso com dano leve",
  missao_controlada: "missão controlada",
  vitoria_apertada: "vitória apertada",
  falha_parcial: "falha parcial",
  falha_grave: "falha grave",
  alerta_perdido: "alerta perdido",
  captura_vilao: "captura realizada",
  traumatico: "tragédia operacional",
  absurdo: "resultado inesperado",
};

const statusToneByDispatcher = {
  empathetic_mentor: "empático",
  tactical_planner: "tático",
  public_face: "público",
  crisis_veteran: "frio sob pressão",
};

const normalizeLookup = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const publicName = (value, fallback) => {
  if (!value) return fallback;
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const findDistrict = (event, missionResult, gameState) => {
  const districtId = event?.districtId ?? missionResult?.districtImpact?.districtId;
  const districtName = event?.bairro ?? missionResult?.districtImpact?.districtName;
  return (
    gameState?.districts?.find((district) => district.id === districtId) ??
    gameState?.districts?.find((district) => normalizeLookup(district.name) === normalizeLookup(districtName)) ??
    null
  );
};

const findFaction = (event, missionResult, gameState) => {
  const factionId = event?.factionId ?? missionResult?.factionImpact?.factionId;
  const factionName = missionResult?.factionImpact?.factionName;
  return (
    gameState?.factions?.find((faction) => faction.id === factionId) ??
    gameState?.factions?.find((faction) => normalizeLookup(faction.name) === normalizeLookup(factionName)) ??
    null
  );
};

const selectedHeroesForMission = (missionResult, gameState) =>
  (missionResult?.heroIds ?? [])
    .map((heroId) => gameState?.heroes?.find((hero) => hero.id === heroId))
    .filter(Boolean);

const relationshipTone = (missionResult) => {
  const changes = missionResult?.relationshipChanges ?? [];
  if (!changes.length) return "solo";
  const average = changes.reduce((sum, change) => sum + (change.to ?? 0), 0) / changes.length;
  if (average >= 35) return "positive";
  if (average <= -20) return "negative";
  return "neutral";
};

export const mapMissionResultToPlayByPlayResult = (missionResult = {}) => {
  const types = new Set();
  const resultType = missionResult.resultType ?? missionResult.outcome;

  if (resultType === "sucesso_exemplar") types.add("resolucao_exemplar");
  if (resultType === "missao_controlada" || resultType === "vitoria_apertada") types.add("missao_controlada");
  if (resultType === "sucesso_com_dano") types.add("sucesso_com_dano_leve");
  if (resultType === "falha_parcial") types.add("falha_parcial");
  if (resultType === "falha_grave") types.add("falha_grave");
  if (resultType === "alerta_perdido") types.add("alerta_perdido");
  if (resultType === "traumatico" || missionResult.deaths?.length) types.add("tragedia_operacional");
  if (missionResult.capturedVillain || resultType === "captura_vilao") types.add("captura_realizada");
  if (missionResult.injuries?.length) types.add("heroi_ferido");
  if (missionResult.deaths?.length) types.add("heroi_morto");
  if (missionResult.activeCombos?.length) types.add("combo_ativado");
  if (missionResult.success && (missionResult.event?.nivelRisco ?? 0) >= 4) types.add("crise_contida");
  if (!missionResult.success && (missionResult.event?.nivelRisco ?? 0) >= 4) types.add("crise_expandida");
  if (!types.size) types.add(missionResult.success ? "missao_controlada" : "falha_parcial");

  return [...types];
};

export function buildMissionNarrativeContext(event, missionResult, gameState) {
  const district = findDistrict(event, missionResult, gameState);
  const faction = findFaction(event, missionResult, gameState);
  const selectedHeroes = selectedHeroesForMission(missionResult, gameState);
  const villain = missionResult?.capturedVillain ?? null;
  const resultTypes = mapMissionResultToPlayByPlayResult(missionResult);
  const rawResult = missionResult?.resultType ?? missionResult?.outcome ?? (missionResult?.success ? "sucesso" : "falha");
  const margin =
    typeof missionResult?.chance === "number" && typeof missionResult?.roll === "number"
      ? missionResult.chance - missionResult.roll
      : null;

  return {
    eventId: event?.id,
    eventTitle: event?.titulo ?? "ocorrência sem título",
    districtId: district?.id ?? event?.districtId,
    districtName: district?.name ?? event?.bairro ?? "a área da ocorrência",
    factionId: faction?.id ?? event?.factionId,
    factionName: faction?.name ?? missionResult?.factionImpact?.factionName,
    villainId: villain?.id,
    villainName: villain?.alcunha ?? villain?.nome,
    risk: event?.nivelRisco ?? 1,
    difficulty: event?.dificuldade ?? 0,
    resultType: resultTypes[0],
    resultTypes,
    resultLabel: resultLabels[rawResult] ?? publicName(rawResult, "resultado operacional"),
    rawResult,
    margin,
    success: Boolean(missionResult?.success),
    civiliansSaved: missionResult?.civiliansSaved ?? 0,
    collateralDamage: missionResult?.materialDamage ?? "não informado",
    selectedHeroes,
    heroCount: selectedHeroes.length,
    heroRoles: selectedHeroes.map((hero) => hero.funcao).filter(Boolean),
    requiredAttributes: event?.requisitosPrincipais ?? [],
    missionTags: event?.tags ?? [],
    activeCombos: missionResult?.activeCombos ?? [],
    injuries: missionResult?.injuries ?? [],
    captures: missionResult?.capturedVillain ? [missionResult.capturedVillain] : [],
    deaths: missionResult?.deaths ?? [],
    teamMorale: gameState?.teamMorale ?? 60,
    dispatcherName: gameState?.dispatcher?.callsign ?? gameState?.dispatcher?.name ?? "Central",
    dispatcherStyle: statusToneByDispatcher[gameState?.dispatcher?.personalityId] ?? "operacional",
    day: gameState?.day ?? missionResult?.day ?? 1,
    timeLimit: event?.limiteTempoNarrativo ?? "fim da ocorrência",
    relationships: missionResult?.relationshipChanges ?? [],
    relationshipTone: relationshipTone(missionResult),
    districtState: district,
    factionState: faction,
  };
}
