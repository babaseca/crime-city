import { dispatcherBudgetDiscount, dispatcherReformBonus } from "./dispatcherSystem";
import { baseUpgradeEffect } from "./baseUpgradeSystem";

const activeTeamStatuses = ["active_team", "assigned_by_command", "reformed_villain"];

const villainImage = (initials, danger = 3) => {
  const palette = ["#14532d", "#854d0e", "#9a3412", "#991b1b", "#581c87"];
  const base = palette[Math.max(0, Math.min(palette.length - 1, danger - 1))];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect width="240" height="240" rx="30" fill="#111827"/>
      <path d="M0 160c52-44 104-56 156-36s84 16 84 16v100H0z" fill="${base}"/>
      <path d="M32 54h176v42H32z" fill="rgba(255,255,255,.08)"/>
      <text x="120" y="136" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="900" fill="#fee2e2">${initials}</text>
      <path d="M68 166h104" stroke="#f43f5e" stroke-width="8" stroke-linecap="round"/>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const factionNameById = {
  coroa_do_subsolo: "Coroa do Subsolo",
  rede_dos_altofalantes: "Rede dos Alto-Falantes",
  oficina_da_mare_seca: "Oficina da Maré Seca",
  irmandade_do_vidro: "Irmandade do Vidro",
  sindicato_do_apagao: "Sindicato do Apagão",
  jardim_das_mascaras: "Jardim das Máscaras",
};

export const normalizeVillain = (villain) => ({
  ...villain,
  imageUrl: villain.imageUrl || villainImage(initials(villain.alcunha), villain.periculosidade),
  historicoEncontros: villain.historicoEncontros ?? [],
  relacoesHerois: villain.relacoesHerois ?? {},
  tentativasReforma: villain.tentativasReforma ?? 0,
  informante: Boolean(villain.informante),
  allyHeroId: villain.allyHeroId ?? null,
});

export const chooseVillainForMission = (villains, event) => {
  const fugitives = villains.filter((villain) => villain.estadoAtual === "fugitivo");
  const pool = fugitives.length > 0 ? fugitives : villains.filter((villain) => villain.estadoAtual !== "reformado");

  if (pool.length === 0) return null;

  const factionName = factionNameById[event.factionId];
  const factionMatch = factionName ? pool.find((villain) => villain.faccao === factionName) : null;
  if (factionMatch) return factionMatch;

  const districtMatch = pool.find((villain) => villain.bairroAtuacao === event.bairro);
  if (districtMatch) return districtMatch;

  return pool[(event.dificuldade + event.nivelRisco) % pool.length];
};

export const captureVillain = (villains, villainId, mission) =>
  villains.map((villain) =>
    villain.id === villainId
      ? {
          ...villain,
          estadoAtual: "capturado",
          riscoFuga: Math.max(10, villain.riscoFuga - 8),
          historicoEncontros: [
            ...villain.historicoEncontros,
            {
              day: mission.day,
              eventTitle: mission.event.titulo,
              result: mission.outcome,
              heroes: mission.heroNames,
            },
          ],
        }
      : villain,
  );

export const interrogateVillain = (state, villainId) => ({
  ...state,
  villains: state.villains.map((villain) =>
    villain.id === villainId
      ? {
          ...villain,
          informante: villain.informante || villain.chanceReforma > 58,
          riscoFuga: Math.max(5, villain.riscoFuga - 4),
          historicoEncontros: [
            ...villain.historicoEncontros,
            {
              day: state.day,
              eventTitle: "Interrogatorio na Central",
              result: villain.chanceReforma > 58 ? "cedeu informacao util" : "resistiu, mas revelou rotina",
              heroes: [],
            },
          ],
        }
      : villain,
  ),
});

export const keepVillainContained = (state, villainId, mode) => {
  const cost = dispatcherBudgetDiscount(state.dispatcher, 6500);

  return {
    ...state,
    villains: state.villains.map((villain) =>
      villain.id === villainId
        ? {
            ...villain,
            estadoAtual: mode === "maxima" ? "preso" : villain.estadoAtual === "fugitivo" ? "capturado" : villain.estadoAtual,
            riscoFuga: Math.max(4, villain.riscoFuga - (mode === "maxima" ? 16 : 7) - baseUpgradeEffect(state.baseUpgrades, "escapeRiskReduction")),
          }
        : villain,
    ),
    budget: mode === "maxima" ? Math.max(0, state.budget - cost) : state.budget,
    budgetLog:
      mode === "maxima"
        ? [
            ...state.budgetLog,
            {
              id: `budget-containment-${villainId}-${Date.now()}`,
              day: state.day,
              type: "expense",
              label: "Transferencia para seguranca maxima",
              amount: cost,
            },
          ]
        : state.budgetLog,
  };
};

const activeTeamCount = (heroes) =>
  heroes.filter((hero) => activeTeamStatuses.includes(hero.teamStatus) && hero.status !== "morto").length;

const villainToAlly = (villain, teamStatus) => {
  const danger = villain.periculosidade ?? 3;
  const control = Math.max(4, 10 - danger + Math.round((villain.chanceReforma ?? 40) / 18));

  return {
    id: `h-aliado-${villain.id}`,
    codinome: `Ex-${villain.alcunha}`,
    nomeCivil: villain.nome,
    imageUrl: villain.imageUrl,
    funcao: danger >= 4 ? "anti-heroi de contencao" : "aliado reformado",
    bio: `${villain.alcunha} aceitou o programa de reparacao da Central. A confianca ainda precisa ser conquistada em campo.`,
    atributos: {
      forca: Math.min(10, 4 + danger),
      mobilidade: Math.max(3, 8 - Math.floor(danger / 2)),
      controle,
      investigacao: Math.max(3, Math.round((villain.chanceReforma ?? 50) / 13)),
      carisma: Math.max(2, Math.round((villain.chanceReforma ?? 45) / 14)),
      resistencia: Math.min(10, 5 + danger),
    },
    energia: 82,
    estresse: 24,
    moral: 58,
    status: "disponivel",
    teamStatus,
    rosterStatus: teamStatus,
    scheduleStatus: teamStatus === "reformed_villain" || teamStatus === "active_team" ? "on_duty" : "reserve",
    fatigue: 8,
    burnoutRisk: 0,
    restDays: 0,
    lastMissionDay: null,
    overworkedCount: 0,
    experiencia: 0,
    missoes: 0,
    sucessos: 0,
    falhas: 0,
    civisSalvos: 0,
    ferimentos: [],
    injuries: [],
    medicalStatus: "liberado",
    recoveryDays: 0,
    traumas: [{ day: 0, source: "Passado no Arquivo de Viloes" }],
    nemeses: [],
    villainTraumas: [],
    tracos: ["em_reforma", "vigiado", danger >= 4 ? "intenso" : "arrependido"],
    arcosPessoais: ["Reparacao publica"],
    falasMarcantes: ["Eu conheco a saida errada. Por isso estou apontando a certa."],
    fame: 20,
    publicImage: "aliado sob observação",
    controversy: 46,
    fans: 8,
    critics: 34,
    mediaTags: ["passado criminal", "segunda chance"],
    recentPosts: [],
  };
};

export const attemptVillainReform = (state, villainId) => {
  const villain = state.villains.find((record) => record.id === villainId);
  const baseCost = 4200 + (villain?.periculosidade ?? 1) * 900;
  const cost = dispatcherBudgetDiscount(state.dispatcher, baseCost);
  if (!villain) return { state, message: "Arquivo nao encontrado." };
  if (state.budget < cost) return { state, message: "Orcamento insuficiente para reabilitacao." };

  const empathyPool = [...state.heroes]
    .filter((hero) => hero.status !== "morto")
    .sort((first, second) => second.atributos.carisma - first.atributos.carisma)
    .slice(0, 3);
  const empathy = empathyPool.reduce((sum, hero) => sum + hero.atributos.carisma, 0) / Math.max(1, empathyPool.length);
  const chance = Math.max(
    5,
    Math.min(
      96,
      villain.chanceReforma +
        empathy * 3 -
        villain.violencia * 8 -
        (villain.tentativasReforma ?? 0) * 5 +
        dispatcherReformBonus(state.dispatcher) +
        baseUpgradeEffect(state.baseUpgrades, "reformBonus"),
    ),
  );
  const success = Math.random() * 100 < chance;
  const shouldBecomeAlly = success && !villain.allyHeroId && (villain.chanceReforma >= 52 || (villain.periculosidade ?? 3) <= 3);
  const allyHeroId = shouldBecomeAlly ? `h-aliado-${villain.id}` : villain.allyHeroId;
  const teamStatus =
    shouldBecomeAlly && activeTeamCount(state.heroes) < state.activeHeroLimit ? "reformed_villain" : "reserve";
  const allyHero = shouldBecomeAlly ? villainToAlly(villain, teamStatus) : null;

  const nextState = {
    ...state,
    budget: state.budget - cost,
    reputation: Math.max(0, Math.min(100, state.reputation + (success ? 3 : -1))),
    heroes: allyHero ? [...state.heroes, allyHero] : state.heroes,
    villains: state.villains.map((record) =>
      record.id === villainId
        ? {
            ...record,
            estadoAtual: success ? "reformado" : "em reabilitacao",
            informante: success ? true : record.informante,
            allyHeroId,
            riscoFuga: success ? Math.max(3, record.riscoFuga - 22) : Math.min(95, record.riscoFuga + 9),
            tentativasReforma: (record.tentativasReforma ?? 0) + 1,
            historicoEncontros: [
              ...record.historicoEncontros,
              {
                day: state.day,
                eventTitle: "Programa de reforma",
                result: success ? "aceitou acordo de reparacao" : "reagiu mal a tentativa",
                heroes: empathyPool.map((hero) => hero.codinome),
              },
            ],
          }
        : record,
    ),
    budgetLog: [
      ...state.budgetLog,
      {
        id: `budget-reform-${villainId}-${Date.now()}`,
        day: state.day,
        type: "expense",
        label: `Reabilitacao: ${villain.alcunha}`,
        amount: cost,
      },
    ],
  };

  return {
    state: nextState,
    message: success
      ? shouldBecomeAlly
        ? `${villain.alcunha} aceitou reparacao e virou ${teamStatus === "reformed_villain" ? "aliado de campo" : "aliado em reserva"}.`
        : `${villain.alcunha} aceitou iniciar reparacao e virou informante.`
      : `${villain.alcunha} resistiu ao processo. O risco de fuga subiu.`,
  };
};
