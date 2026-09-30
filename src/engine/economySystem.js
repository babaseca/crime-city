import balanceConfig from "../data/balanceConfig.json";

const economy = balanceConfig.economy ?? {};

const clampMoney = (value) => {
  const amount = Math.round(Number(value) || 0);
  return economy.allowNegativeBudget ? amount : Math.max(0, amount);
};

export const formatCurrencyBRL = (value = 0) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export const calculateMissionPayout = ({ event, success, resultType, civiliansSaved = 0, capturedVillain = null, materialDamage = "baixo" }) => {
  const risk = event?.nivelRisco ?? 1;
  const difficulty = event?.dificuldade ?? 45;
  const base = (economy.baseMissionReward ?? 6500) + risk * 850 + difficulty * 28;
  const multiplier = success
    ? resultType === "sucesso_exemplar"
      ? economy.successRewardMultiplier ?? 1.25
      : economy.controlledMissionRewardMultiplier ?? 1
    : resultType === "falha_grave"
      ? economy.criticalFailureRewardMultiplier ?? 0.1
      : economy.partialFailureRewardMultiplier ?? 0.45;
  const rescueBonus = Math.max(0, civiliansSaved) * (economy.civilianSavedReward ?? 55);
  const districtBonus = success ? (economy.districtTrustBonusReward ?? 700) : 0;
  const captureBonus = capturedVillain ? economy.factionCaptureBonus ?? 4500 : 0;
  const damagePenalty = success ? 0 : materialDamage === "severo" ? risk * 900 : materialDamage === "alto" ? risk * 550 : risk * 250;

  return Math.max(0, Math.round(base * multiplier + rescueBonus + districtBonus + captureBonus - damagePenalty));
};

export const calculateDailyOperationalGrant = (state, report = {}) => {
  const minimum = economy.minimumDailyOperationalGrant ?? 9000;
  const reputation = report.reputation ?? state.reputation ?? 60;
  const resolvedCount = report.resolved?.length ?? 0;
  const successBonus = resolvedCount * 950;
  const reputationBonus = Math.max(0, reputation - 50) * 80;
  const lowBudgetBonus = (state.budget ?? 0) < (economy.budgetWarningThreshold ?? 25000) ? Math.round(minimum * 0.45) : 0;

  return Math.round(minimum + successBonus + reputationBonus + lowBudgetBonus);
};

export const calculateDailyCosts = (state) => {
  const heroes = state.heroes ?? [];
  const activeStatuses = new Set(["active_team", "assigned_by_command", "reformed_villain"]);
  const activeHeroes = heroes.filter((hero) => activeStatuses.has(hero.teamStatus) && hero.status !== "morto");
  const reserveHeroes = heroes.filter((hero) => hero.teamStatus === "reserve");
  const staffedHeroes = [...activeHeroes, ...reserveHeroes];
  const activeFixed = activeHeroes.length * (economy.dailyFixedCostPerActiveHero ?? 350);
  const reserveFixed = reserveHeroes.length * (economy.dailyFixedCostPerReserveHero ?? 120);
  const salaries = staffedHeroes.reduce((sum, hero) => sum + Math.round((hero.salarioMensal ?? 0) / (economy.salaryDailyDivisor ?? 30)), 0);
  const custody = Math.round((state.custody?.dailyCost ?? 0) * Math.max(1, (state.villains ?? []).filter((villain) => ["capturado", "preso"].includes(villain.estadoAtual ?? villain.status)).length / 8));
  const total = Math.max(0, activeFixed + reserveFixed + salaries + custody);

  return { total, activeFixed, reserveFixed, salaries, custody };
};

export const applyBudgetFloorRules = (budget, state = {}) => {
  const softFloor = economy.budgetSoftFloor ?? 12000;
  const warning = economy.budgetWarningThreshold ?? 25000;
  let nextBudget = clampMoney(budget);
  let floorGrant = 0;

  if (nextBudget < softFloor && (state.day ?? 1) <= 15) {
    floorGrant = softFloor - nextBudget;
    nextBudget = softFloor;
  } else if (nextBudget < warning && (state.day ?? 1) <= 10) {
    floorGrant = Math.round((warning - nextBudget) * 0.25);
    nextBudget += floorGrant;
  }

  return { budget: clampMoney(nextBudget), floorGrant };
};

export const calculateScaledCost = (amount, multiplierKey) => Math.max(0, Math.round((Number(amount) || 0) * (economy[multiplierKey] ?? 1)));

export const balanceConfigVersion = balanceConfig.version ?? "0.9.5";
export const startingBudget = economy.startingBudget ?? 110000;
