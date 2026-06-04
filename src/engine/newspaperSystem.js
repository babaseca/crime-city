import { getMostControversialHeroes, getMostFamousHeroes } from "./heroFameSystem";

const toneByReport = (report) => {
  if (report.heroesKilled > 0) return "trágico";
  if (report.failures.length > report.resolved.length) return "crítico";
  if (report.resolved.length >= 2 && report.failures.length === 0) return "otimista";
  return "equilibrado";
};

const bestMission = (missions) =>
  missions
    .filter((mission) => mission.success)
    .sort((first, second) => second.civiliansSaved + second.reputationDelta - (first.civiliansSaved + first.reputationDelta))[0];

const worstMission = (missions) =>
  missions
    .filter((mission) => !mission.success)
    .sort((first, second) => first.reputationDelta - second.reputationDelta)[0];

export const generateNewspaper = ({ report, missions, heroes, districts = [], factions = [], socialPosts = [], commandEvent, dispatcher, activeChains = [] }) => {
  const tone = toneByReport(report);
  const dayMissions = missions.filter((mission) => mission.day === report.day);
  const best = bestMission(dayMissions);
  const worst = worstMission(dayMissions);
  const injured = dayMissions.flatMap((mission) => mission.injuries ?? [])[0];
  const death = dayMissions.flatMap((mission) => mission.deaths ?? [])[0];
  const capture = dayMissions.find((mission) => mission.capturedVillain)?.capturedVillain;
  const pressureDistrict =
    districts.find((district) => district.id === worst?.event.districtId) ??
    [...districts].sort((a, b) => b.dangerLevel - a.dangerLevel)[0];
  const highlightedHero =
    best ? heroes.find((hero) => best.heroIds.includes(hero.id)) : getMostFamousHeroes(heroes, 1)[0] ?? null;
  const controversialHero = getMostControversialHeroes(heroes, 1)[0] ?? null;
  const hotFaction =
    factions.find((faction) => faction.id === capture?.factionId) ??
    [...factions].sort((a, b) => b.heat + b.resources - (a.heat + a.resources))[0];
  const streetVoice = socialPosts[0];
  const chain = activeChains[0];
  const playByPlayHeadlines = dayMissions.flatMap((mission) => mission.headlineSeeds ?? mission.playByPlay?.seeds?.headlineSeeds ?? []).filter(Boolean);
  const mainHeadline =
    tone === "trágico"
      ? `${death?.codinome ?? "Herói da Central"} morre em serviço e Nova Aurora silencia`
      : tone === "otimista"
        ? `Central ganha fôlego enquanto bairros respiram melhor`
        : tone === "crítico"
          ? `${pressureDistrict?.name ?? "Nova Aurora"} cobra presença após plantão irregular`
          : best
            ? `${highlightedHero?.codinome ?? "Equipe da Central"} segura crise em ${best.event.bairro}`
            : `Plantão termina com sirenes cruzadas em ${pressureDistrict?.name ?? "Nova Aurora"}`;

  const sections = {
    cityAlert: pressureDistrict
      ? `${pressureDistrict.name} encerra o dia com perigo ${pressureDistrict.dangerLevel}/100, confiança ${pressureDistrict.trustInCentral}/100 e estabilidade ${pressureDistrict.stability}/100.`
      : "A cidade segue monitorada, mas sem bairro crítico isolado no fechamento.",
    heroSpotlight: highlightedHero
      ? `${highlightedHero.codinome} aparece como destaque público: ${highlightedHero.publicImage}, fama ${highlightedHero.fame}/100.`
      : "Nenhum destaque individual claro. A Central trabalhou como bloco.",
    districtPressure: pressureDistrict
      ? `${pressureDistrict.name} está ${pressureDistrict.crisis ? `em ${pressureDistrict.crisis.label}` : pressureDistrict.dangerLevel > 65 ? "sob pressão" : "sob observação"}.`
      : "Sem bairro sob pressão específica.",
    factionMovement: hotFaction
      ? `${hotFaction.name} registra ameaça ${hotFaction.threatLevel}/100, recursos ${hotFaction.resources}/100 e pressão ${hotFaction.heat}/100.`
      : "Nenhuma facção assumiu o noticiário, o que raramente significa paz.",
    streetVoice: streetVoice ? `${streetVoice.authorHandle}: ${streetVoice.text.replace(/^@\w+:\s*/, "")}` : "As ruas comentam baixo. Isso também é informação.",
    commandNote: commandEvent
      ? `Comando da Central: ${commandEvent.message}`
      : dispatcher?.callsign
        ? `Bastidor: ${dispatcher.callsign} assinou o fechamento sem café suficiente.`
        : "O Comando arquivou o relatório e fingiu que não leu a parte dos custos.",
    chainNote: chain ? `Pistas ativas indicam continuidade operacional: ${chain.chainId}.` : "Nenhuma cadeia de eventos avançou no fechamento.",
  };

  const secondary = [
    ...playByPlayHeadlines.slice(0, 2),
    best ? `${best.event.titulo}: ${best.civiliansSaved} civis salvos e dano ${best.materialDamage}` : null,
    worst ? `${worst.event.bairro} cobra respostas após ocorrência mal resolvida` : null,
    injured ? `${injured.name} passa pela enfermaria após ${injured.injury.source}` : null,
    capture ? `${capture.alcunha} entra no Arquivo de Vilões após operação da Central` : null,
    controversialHero && controversialHero.controversy > 40 ? `${controversialHero.codinome} cresce nas redes, mas também nas críticas` : null,
    report.socialDelta ? `Rede Aurora alterou reputação em ${report.socialDelta > 0 ? "+" : ""}${report.socialDelta}` : null,
  ].filter(Boolean);

  return {
    id: `newspaper-day-${report.day}`,
    day: report.day,
    name: "Nova Aurora Hoje",
    tone,
    headline: mainHeadline,
    secondary: secondary.slice(0, 6),
    sections,
    opinion:
      tone === "trágico"
        ? "A cidade precisa lembrar que heroísmo não é recurso renovável. Cada ordem no rádio carrega uma pessoa."
        : tone === "crítico"
          ? "A população não exige perfeição. Exige presença, transparência e menos promessas com capacete limpo."
          : tone === "otimista"
            ? "Quando a Central acerta, Nova Aurora respira. Que a prefeitura respire junto e pare de cortar café."
            : "Entre aplausos, prints e reclamações, a Central segue fazendo o trabalho que aparece quando todo o resto falha.",
    footer:
      tone === "otimista"
        ? "Charge textual: uma sirene pede férias e recebe um formulário de produtividade."
        : "Rodapé: a prefeitura promete investigar um buraco que já tinha placa, apelido e fila de visitação.",
    indicators: {
      resolved: report.resolved.length,
      failures: report.failures.length,
      civiliansSaved: report.civiliansSaved,
      reputation: report.reputation,
      budgetDelta: report.dayIncome - report.dayExpenses,
      district: pressureDistrict?.name ?? "Nova Aurora",
      faction: hotFaction?.name ?? "sem facção dominante",
    },
  };
};
