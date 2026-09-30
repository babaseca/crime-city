const domoFaiscaConflict = {
  id: "alpha11_conflict_domo_faisca_gerador",
  type: "conflict",
  requiredHeroIds: ["h-domo-prata", "h-faisca-norte"],
  requiredRelationship: { tensionMin: 40 },
  requiredFacts: ["infrastructure_destroyed", "civilians_rescued"],
  text:
    '"Eu ainda acho que seu plano foi irresponsável", disse Domo. "Mas funcionou." Faísca demorou alguns segundos para perceber que aquilo era um elogio.',
  effects: { teamMorale: 1, relationshipDelta: { respect: 2, closeness: 1, tension: 1 } },
};

const auroraCifraBond = {
  id: "alpha11_bond_aurora_cifra_rotas",
  type: "bonding",
  requiredHeroIds: ["h-aurora-vetor", "h-cifra-rasa"],
  requiredRelationship: { trustMin: 60 },
  requiredFacts: ["mission_success_clean"],
  text:
    "Cifra recalculou três rotas antes que Aurora terminasse a primeira travessia. Não houve aplauso, só a eficiência estranha de duas pessoas que já sabiam como a outra pensava.",
  effects: { teamMorale: 1, relationshipDelta: { trust: 2, respect: 1 } },
};

const ecoFaiscaConflict = {
  id: "alpha11_conflict_eco_faisca_publico",
  type: "conflict",
  requiredHeroIds: ["h-eco-mandarim", "h-faisca-norte"],
  requiredRelationship: { tensionMin: 45 },
  requiredFacts: ["hero_disobeyed_order"],
  text:
    "Eco fechou o canal público antes de falar com Faísca. 'Você salvou gente. Também ensinou a cidade a duvidar do nosso rádio.'",
  effects: { teamMorale: -1, relationshipDelta: { tension: 2, respect: 1 } },
};

const refusalScenes = [
  ["alpha11_refusal_domo_sacrificio", "h-domo-prata", "civilians_harmed", "Domo não recusou a próxima missão. Recusou o atalho. A Central registrou a diferença como aviso, não como indisciplina."],
  ["alpha11_refusal_eco_midia", "h-eco-mandarim", "media_incident", "Eco pediu que outro herói falasse com a imprensa. Pela primeira vez, exposição pública pareceu custo, não ferramenta."],
  ["alpha11_refusal_cifra_dados", "h-cifra-rasa", "police_embarrassed", "Cifra aceitou ir a campo, mas recusou assinar um relatório que escondia incerteza operacional."],
  ["alpha11_refusal_faisca_protocolo", "h-faisca-norte", "government_angry", "Faísca olhou a autorização pendente e disse que entraria se a Central assumisse o peso junto com ele."],
  ["alpha11_refusal_horizonte_cego", "h-horizonte-lince", "hero_disobeyed_order", "Horizonte não questionou coragem. Questionou entrar sem mapa e chamar isso de estratégia."],
].map(([id, heroId, fact, text]) => ({
  id,
  type: "refusal",
  requiredHeroIds: [heroId],
  requiredFacts: [fact],
  text,
  effects: { teamMorale: -1, stress: 1 },
}));

const reconciliationScenes = [
  ["alpha11_reconciliation_domo_faisca", ["h-domo-prata", "h-faisca-norte"], "mission_success_costly", "Domo deixou uma chave de gerador na bancada de Faísca. Não era desculpa. Era permissão para tentar conversar depois."],
  ["alpha11_reconciliation_eco_faisca", ["h-eco-mandarim", "h-faisca-norte"], "media_incident", "Eco escreveu a primeira frase do comunicado. Faísca escreveu a segunda. Nenhuma ficou perfeita, mas as duas ficaram honestas."],
  ["alpha11_reconciliation_aurora_horizonte", ["h-aurora-vetor", "h-horizonte-lince"], "hero_protected_teammate", "Horizonte marcou no mapa uma rota que Aurora já tinha sentido nos ossos. As duas fingiram que aquilo não era confiança."],
  ["alpha11_reconciliation_bruma_geodo", ["h-bruma-livre", "h-geodo-vivo"], "infrastructure_destroyed", "Bruma ficou em silêncio ao lado de Geodo. Depois de dez minutos, ele parou de pedir desculpa para concreto quebrado."],
  ["alpha11_reconciliation_cifra_aurora", ["h-cifra-rasa", "h-aurora-vetor"], "mission_success_clean", "Cifra salvou a telemetria da corrida de Aurora. Aurora salvou o arquivo com nome errado: 'foi ideia dela'."],
].map(([id, requiredHeroIds, fact, text]) => ({
  id,
  type: "reconciliation",
  requiredHeroIds,
  requiredFacts: [fact],
  requiredRelationship: { tensionMin: 18 },
  text,
  effects: { teamMorale: 1, relationshipDelta: { trust: 1, closeness: 2, tension: -2 } },
}));

const conflictPairs = [
  ["h-domo-prata", "h-faisca-norte", "infrastructure_destroyed", "preservar estrutura ou cortar o risco"],
  ["h-eco-mandarim", "h-faisca-norte", "hero_disobeyed_order", "legitimidade pública ou ação direta"],
  ["h-aurora-vetor", "h-horizonte-lince", "hero_disobeyed_order", "velocidade ou leitura de terreno"],
  ["h-cifra-rasa", "h-horizonte-lince", "police_embarrassed", "dado oficial ou instinto de campo"],
  ["h-bruma-livre", "h-geodo-vivo", "infrastructure_destroyed", "conter devagar ou segurar no corpo"],
];

const generatedConflicts = Array.from({ length: 18 }, (_, index) => {
  const [first, second, fact, theme] = conflictPairs[index % conflictPairs.length];
  return {
    id: `alpha11_conflict_${String(index + 1).padStart(2, "0")}`,
    type: "conflict",
    requiredHeroIds: [first, second],
    requiredRelationship: { tensionMin: 28 },
    requiredFacts: [fact],
    text: `A discussão voltou ao mesmo ponto: ${theme}. Ninguém levantou a voz, o que deixou tudo mais sério.`,
    effects: { teamMorale: index % 3 === 0 ? -1 : 0, relationshipDelta: { tension: 1, respect: index % 2 } },
  };
});

const bondingPairs = [
  ["h-aurora-vetor", "h-cifra-rasa", "mission_success_clean", "rota limpa"],
  ["h-bruma-livre", "h-geodo-vivo", "hero_protected_teammate", "barreira compartilhada"],
  ["h-domo-prata", "h-eco-mandarim", "civilians_rescued", "civis primeiro"],
  ["h-geodo-vivo", "h-faisca-norte", "hospital_saved", "peso e faísca"],
  ["h-aurora-vetor", "h-bruma-livre", "mission_success_clean", "ritmo controlado"],
];

const generatedBonding = Array.from({ length: 9 }, (_, index) => {
  const [first, second, fact, theme] = bondingPairs[index % bondingPairs.length];
  return {
    id: `alpha11_bonding_${String(index + 1).padStart(2, "0")}`,
    type: "bonding",
    requiredHeroIds: [first, second],
    requiredRelationship: { trustMin: 45 },
    requiredFacts: [fact],
    text: `Depois da missão, a conversa foi curta. O suficiente para transformar ${theme} em um código interno da dupla.`,
    effects: { teamMorale: 1, relationshipDelta: { trust: 1, closeness: 1 } },
  };
});

const reflectionFacts = ["hospital_saved", "neighborhood_blackout", "civilians_rescued", "mission_failed_but_lives_saved", "media_incident"];

const reflectionScenes = Array.from({ length: 20 }, (_, index) => {
  const fact = reflectionFacts[index % reflectionFacts.length];
  return {
    id: `alpha11_reflection_${String(index + 1).padStart(2, "0")}`,
    type: "reflection",
    requiredFacts: [fact],
    text: `A sala ficou alguns minutos olhando para o registro ${fact}. A Central não chamou aquilo de lição, mas todo mundo saiu sabendo onde doeu.`,
    effects: { teamMorale: index % 4 === 0 ? -1 : 1, stress: index % 5 === 0 ? 1 : -1 },
  };
});

export const alpha11TeamScenes = [
  domoFaiscaConflict,
  ecoFaiscaConflict,
  ...generatedConflicts,
  auroraCifraBond,
  ...generatedBonding,
  ...refusalScenes,
  ...reconciliationScenes,
  ...reflectionScenes,
];

export const alpha11TeamSceneSummary = {
  conflict: 20,
  bonding: 10,
  refusal: 5,
  reconciliation: 5,
  reflection: 20,
};

export default alpha11TeamScenes;
