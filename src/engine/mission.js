import { chooseVillainForMission } from "./villainSystem";
import { baseUpgradeEffect } from "./baseUpgradeSystem";
import { calculateComboEffects, getAvailableCombos } from "./comboSystem";
import { dispatcherChanceModifier, dispatcherRelationshipBonus, dispatcherReputationShield } from "./dispatcherSystem";
import { calculateMissionPayout, calculateScaledCost } from "./economySystem";
import { missionResultType, selectDialogue } from "./dialogueSystem";
import { deriveMissionFacts, relationshipDeltaFromFacts } from "./missionFacts";
import { analyzeTeamMorals } from "./moralSystem";
import {
  adjustRelationshipProfile,
  averageTeamRelationship,
  pairKey,
  relationshipLabel,
  relationshipScore,
  relationshipValue,
} from "./relationships";

export const attributeLabels = {
  forca: "Força",
  mobilidade: "Mobilidade",
  controle: "Controle",
  investigacao: "Investigação",
  carisma: "Carisma",
  resistencia: "Resistência",
};

const allAttributes = Object.keys(attributeLabels);

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const average = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

export const heroOperationalStatus = (hero) => {
  if (hero.status === "morto" || hero.teamStatus === "dead") return "morto";
  if ((hero.ferimentos ?? []).some((injury) => injury.daysRemaining > 0)) return "ferido";
  if (hero.energia <= 18 || hero.estresse >= 86) return "exausto";
  if (hero.energia <= 38 || hero.estresse >= 68) return "sobrecarregado";
  if (hero.energia <= 55 || hero.estresse >= 50) return "cansado";
  return "disponível";
};

const roleMatchBonus = (event, hero) => {
  const tags = event.tags.join(" ");
  const role = hero.funcao;

  if (tags.includes("dados") && role.includes("analise")) return 5;
  if (tags.includes("saude") && role.includes("medico")) return 5;
  if (tags.includes("agua") && role.includes("aquatico")) return 5;
  if (tags.includes("multidao") && role.includes("diplomacia")) return 5;
  if (tags.includes("estrutura") && role.includes("conten")) return 5;
  if (tags.includes("energia") && role.includes("energia")) return 5;
  if (tags.includes("resgate") && role.includes("resgate")) return 4;

  return 0;
};

const traumaLoad = (hero) => (hero.traumas ?? []).length * 2 + (hero.ferimentos ?? []).length * 3;

const relationPressure = (team, relationships) => {
  if (team.length < 2) return 0;

  const values = [];
  for (let i = 0; i < team.length; i += 1) {
    for (let j = i + 1; j < team.length; j += 1) {
      values.push(relationshipValue(relationships, team[i].id, team[j].id));
    }
  }

  return Math.min(18, Math.abs(Math.min(0, ...values)) * 0.16);
};

const moraleMissionBonus = (teamMorale = 60) => {
  if (teamMorale >= 82) return 5;
  if (teamMorale >= 64) return 2;
  if (teamMorale <= 20) return -7;
  if (teamMorale <= 40) return -3;
  return 0;
};

const schedulePenalty = (hero) => {
  if (!hero.scheduleStatus || hero.scheduleStatus === "on_duty") return 0;
  if (hero.scheduleStatus === "resting") return 7;
  if (hero.scheduleStatus === "training") return 9;
  if (hero.scheduleStatus === "therapy") return 12;
  if (hero.scheduleStatus === "médical") return 22;
  return 15;
};

const injuryLoad = (hero) =>
  (hero.injuries ?? hero.ferimentos ?? []).reduce((sum, injury) => {
    const penalty = Object.values(injury.statPenalties ?? {}).reduce((inner, value) => inner + Math.abs(value), 0);
    const severity = injury.severity === "grave" ? 6 : injury.severity === "critica" ? 12 : injury.severity === "media" ? 4 : 2;
    return sum + penalty * 2 + severity;
  }, 0);

export const riskLabel = (risk) => {
  if (risk >= 45) return "extremo";
  if (risk >= 28) return "alto";
  if (risk >= 14) return "moderado";
  return "baixo";
};

export const calculateMissionChance = (event, team, relationships, dispatcher = null, baseUpgrades = [], options = {}) => {
  if (team.length === 0) {
    return {
      chance: 0,
      capability: 0,
      fatiguePenalty: 0,
      relationBonus: 0,
      roleBonus: 0,
      dispatcherBonus: 0,
      upgradeBonus: 0,
      comboBonus: 0,
      moraleBonus: 0,
      moralBonus: 0,
      moralStress: 0,
      moralTension: 0,
      injuryRisk: 0,
      deathRisk: 0,
      woundRiskLabel: "baixo",
      deathRiskLabel: "baixo",
    };
  }

  const requirementScores = event.requisitosPrincipais.map((attribute) => {
    const best = Math.max(...team.map((hero) => hero.atributos[attribute]));
    const support = average(team.map((hero) => hero.atributos[attribute]));
    return best * 7.4 + support * 2.4;
  });
  const generalReadiness =
    average(team.map((hero) => average(allAttributes.map((attribute) => hero.atributos[attribute])))) * 2.1;
  const capability = average(requirementScores) + generalReadiness;
  const fatiguePenalty = average(
    team.map((hero) => (100 - hero.energia) * 0.24 + hero.estresse * 0.34 + traumaLoad(hero) + (hero.fatigue ?? 0) * 0.18 + schedulePenalty(hero) + injuryLoad(hero)),
  );
  const relationBonus = averageTeamRelationship(team, relationships) * 0.22;
  const roleBonus = average(team.map((hero) => roleMatchBonus(event, hero)));
  const dispatcherBonus = dispatcherChanceModifier(dispatcher, event, team);
  const upgradeBonus = baseUpgradeEffect(baseUpgrades, "missionChanceBonus");
  const activeCombos = getAvailableCombos(team, event, relationships, options.unlockedCombos ?? []);
  const comboEffects = calculateComboEffects(activeCombos);
  const comboBonus = comboEffects.successChanceBonus;
  const moraleBonus = moraleMissionBonus(options.teamMorale);
  const moralAnalysis = analyzeTeamMorals(event, team, relationships);
  const moralBonus = moralAnalysis.bonus;
  const sizeBonus = team.length === 1 ? -4 : team.length === 2 ? 5 : 8;
  const riskPressure = event.nívelRisco * 4.5;
  const raw =
    48 +
    capability +
    relationBonus +
    roleBonus +
    dispatcherBonus +
    upgradeBonus +
    comboBonus +
    moraleBonus +
    moralBonus +
    sizeBonus -
    fatiguePenalty -
    event.dificuldade * 0.82 -
    riskPressure;
  const chance = Math.round(clamp(raw, 6, 96));
  const injuryRisk = Math.round(
    clamp(
      event.nívelRisco * 5 +
        (100 - chance) * 0.28 +
        fatiguePenalty * 0.24 +
        relationPressure(team, relationships) +
        moralAnalysis.stress +
        moralAnalysis.tensionRisk * 0.1 -
        comboEffects.injuryRiskReduction,
      3,
      82,
    ),
  );
  const deathRisk =
    event.nívelRisco >= 4
      ? Math.round(
          clamp(
            (event.nívelRisco - 3) * 4 +
              Math.max(0, event.dificuldade - 70) * 0.2 +
              Math.max(0, fatiguePenalty - 22) * 0.18 +
              relationPressure(team, relationships) * 0.16 +
              moralAnalysis.tensionRisk * 0.05,
            0,
            34,
          ),
        )
      : Math.round(clamp(Math.max(0, event.nívelRisco - 2) + Math.max(0, 45 - chance) * 0.08, 0, 9));

  return {
    chance,
    capability: Math.round(capability),
    fatiguePenalty: Math.round(fatiguePenalty),
    relationBonus: Math.round(relationBonus),
    roleBonus: Math.round(roleBonus),
    dispatcherBonus,
    upgradeBonus,
    comboBonus,
    moraleBonus,
    moralBonus,
    moralStress: moralAnalysis.stress,
    moralTension: moralAnalysis.tensionRisk,
    moralAnalysis,
    activeCombos,
    injuryRisk,
    deathRisk,
    woundRiskLabel: riskLabel(injuryRisk),
    deathRiskLabel: riskLabel(deathRisk),
  };
};

const outcomeText = (success, margin, deaths, injuries) => {
  if (deaths.length > 0) return success ? "sucesso com perda heroica" : "falha com perda heroica";
  if (success && injuries.length > 0) return "sucesso com dano leve";
  if (success && margin >= 35) return "resolução exemplar";
  if (success && margin >= 15) return "missão controlada";
  if (success) return "vitória apertada";
  if (margin <= -35) return "falha grave";
  if (margin <= -15) return "falha parcial";
  return "quase deu certo";
};

const materialDamage = (event, success, margin) => {
  const value = success ? event.nívelRisco * 8 - Math.max(0, margin) : event.nívelRisco * 18 + Math.abs(margin);
  if (value >= 78) return "severo";
  if (value >= 46) return "alto";
  if (value >= 22) return "médio";
  return "baixo";
};

const civiliansSaved = (event, success, margin) =>
  Math.max(0, Math.round(event.nívelRisco * 8 + event.dificuldade / 5 + (success ? 10 : -8) + Math.max(-8, margin / 3)));

const missionNarrative = (event, team, success, chance, deaths) => {
  const leader = team.reduce((best, hero) => (hero.energia > best.energia ? hero : best), team[0]);
  const reqs = event.requisitosPrincipais.map((attribute) => attributeLabels[attribute]).join(" e ");

  if (deaths.length > 0) {
    return `${leader.codinome} manteve a equipe em movimento em ${event.bairro}, mas a ocorrência cobrou um preço permanente. A Central registrou silêncio operacional antes de qualquer comemoração.`;
  }

  if (success) {
    return `${leader.codinome} coordenou a resposta em ${event.bairro}. A equipe cobriu ${reqs.toLowerCase()} com chance estimada de ${chance}% e encerrou o alerta antes do limite de ${event.limiteTempoNarrativo}.`;
  }

  return `A equipe chegou a conter parte da crise em ${event.bairro}, mas a pressão de ${reqs.toLowerCase()} superou o ritmo operacional. A cidade absorveu o impacto e vai cobrar uma resposta melhor.`;
};

const injuryName = (event) => {
  if (event.tags.includes("incendio") || event.tags.includes("calor")) return "queimadura leve";
  if (event.tags.includes("subsolo") || event.tags.includes("estrutura")) return "contusão estrutural";
  if (event.tags.includes("quimica")) return "irritação química";
  if (event.tags.includes("som")) return "trauma auditivo";
  return "lesão de campo";
};

const lastWords = (hero, success) => {
  if (success) return "Fecha a ocorrência. Eles passaram.";
  if (hero.tracos.includes("brincalhao")) return "Diz pra base que eu ainda quero minha sobremesa.";
  if (hero.tracos.includes("protetora")) return "Ninguém fica para trás. Nem hoje.";
  return "Continuem. A cidade ainda está chamando.";
};

export const resolveMission = async ({
  event,
  team,
  relationships,
  villains = [],
  day = 1,
  dispatcher = null,
  recentDialogues = [],
  baseUpgrades = [],
  teamMorale = 60,
  unlockedCombos = [],
}) => {
  const missionId = `mission-${event.id}-${Date.now()}`;
  const preview = calculateMissionChance(event, team, relationships, dispatcher, baseUpgrades, { teamMorale, unlockedCombos });
  const comboEffects = calculateComboEffects(preview.activeCombos ?? []);
  const moralFitByHero = new Map((preview.moralAnalysis?.heroFits ?? []).map((fit) => [fit.heroId, fit]));
  const roll = Math.floor(Math.random() * 100) + 1;
  const success = roll <= preview.chance;
  const margin = preview.chance - roll;
  const captureRoll = success && event.nívelRisco >= 3 && Math.random() * 100 < 26 + event.nívelRisco * 4;
  const capturedVillain = captureRoll ? chooseVillainForMission(villains, event) : null;
  const injuries = [];
  const deaths = [];
  const saved = civiliansSaved(event, success, margin);
  const damage = materialDamage(event, success, margin);
  const resultType = missionResultType({
    success,
    margin,
    deaths,
    injuries,
    capturedVillain,
    materialDamage: damage,
    outcome: outcomeText(success, margin, deaths, injuries),
  });

  const heroUpdates = team.map((hero) => {
    const enduranceRelief = hero.atributos.resistencia * 0.75;
    const energyLoss = Math.round(clamp(event.nívelRisco * 5 + event.dificuldade / 13 - enduranceRelief, 6, 34));
    const stressRelief = success ? 0 : baseUpgradeEffect(baseUpgrades, "stressReduction");
    const moralStress = moralFitByHero.get(hero.id)?.stress ?? 0;
    const stressGain = Math.round(
      clamp((success ? event.nívelRisco * 3 : event.nívelRisco * 6) + Math.max(0, 70 - preview.chance) / 8, 3, 34),
    ) + moralStress - stressRelief - comboEffects.stressReduction;
    const xpBonus = baseUpgradeEffect(baseUpgrades, "xpBonus");
    const individualDeathRisk =
      preview.deathRisk +
      (hero.energia < 25 ? 7 : 0) +
      (hero.estresse > 78 ? 5 : 0) +
      ((hero.ferimentos ?? []).length > 0 ? 5 : 0) +
      (success ? 0 : 5);
    const dies = event.nívelRisco >= 4 && Math.random() * 100 < individualDeathRisk * 0.32;
    const injured = !dies && Math.random() * 100 < preview.injuryRisk * (success ? 0.35 : 0.58);
    const nextHero = {
      ...hero,
      energia: dies ? 0 : Math.max(0, hero.energia - energyLoss),
      estresse: dies ? 100 : Math.min(100, hero.estresse + stressGain),
      experiencia:
        hero.experiencia +
        (success ? Math.round(7 + event.dificuldade / 9 + event.nívelRisco * 2) : Math.round(4 + event.nívelRisco * 1.5)) +
        xpBonus,
      missoes: (hero.missoes ?? 0) + 1,
      sucessos: (hero.sucessos ?? 0) + (success ? 1 : 0),
      falhas: (hero.falhas ?? 0) + (success ? 0 : 1),
      civisSalvos: (hero.civisSalvos ?? 0) + Math.floor(saved / team.length),
    };

    if (injured) {
      const injury = {
        id: `injury-${event.id}-${hero.id}-${Date.now()}`,
        name: injuryName(event),
        severity: event.nívelRisco >= 5 || !success ? "grave" : "leve",
        durationDays: event.nívelRisco >= 5 || !success ? 3 : 2,
        daysRemaining: event.nívelRisco >= 5 || !success ? 3 : 2,
        source: event.titulo,
        statPenalties: event.nívelRisco >= 5 || !success ? { resistencia: -2, mobilidade: -1 } : { resistencia: -1 },
        riskIfDeployed: event.nívelRisco >= 5 || !success ? 28 : 12,
        treatmentCost: calculateScaledCost(event.nívelRisco >= 5 || !success ? 3600 : 1200, "treatmentCostMultiplier"),
      };
      nextHero.ferimentos = [...(nextHero.ferimentos ?? []), injury];
      injuries.push({ heroId: hero.id, name: hero.codinome, injury });
    }

    if (dies) {
      const death = {
        heroId: hero.id,
        codinome: hero.codinome,
        nomeCivil: hero.nomeCivil,
        imageUrl: hero.imageUrl,
        day,
        finalMission: event.titulo,
        lastLine: lastWords(hero, success),
        civiliansSaved: nextHero.civisSalvos,
        legacy: `${hero.codinome} segurou a linha em ${event.bairro} quando a cidade mais precisava.`,
      };
      nextHero.status = "morto";
      nextHero.teamStatus = "dead";
      deaths.push(death);
    } else {
      nextHero.status = heroOperationalStatus(nextHero);
    }

    return {
      heroId: hero.id,
      energyLoss,
      stressGain: Math.max(0, stressGain),
      experienceGain: nextHero.experiencia - hero.experiencia,
      injury: injured ? injuries.find((entry) => entry.heroId === hero.id)?.injury : null,
      died: dies,
      nextHero,
    };
  });

  const relationshipChanges = [];
  const nextRelationships = { ...relationships };
  const missionFacts = deriveMissionFacts({
    event,
    team,
    success,
    margin,
    civiliansSaved: saved,
    materialDamage: damage,
    moralAnalysis: preview.moralAnalysis,
  });
  const dispatcherRelationBonus = dispatcherRelationshipBonus(dispatcher);

  for (let i = 0; i < team.length; i += 1) {
    for (let j = 0; j < team.length; j += 1) {
      if (i === j) continue;
      const first = team[i];
      const second = team[j];
      const key = pairKey(first.id, second.id);
      const current = relationshipValue(nextRelationships, first.id, second.id);
      const factChange = relationshipDeltaFromFacts({
        fromHero: first,
        toHero: second,
        event,
        facts: missionFacts,
        relationships: nextRelationships,
        success,
      });
      if (!factChange) continue;
      const nextProfile = adjustRelationshipProfile(nextRelationships[key], dispatcherRelationBonus * 0.4, {
        ...factChange.delta,
        flags: factChange.sourceFactIds,
      });
      const nextValue = relationshipScore(nextProfile);

      nextRelationships[key] = nextProfile;
      relationshipChanges.push({
        ...factChange,
        key,
        heroIds: [first.id, second.id],
        names: [first.codinome, second.codinome],
        sourceMissionId: missionId,
        from: current,
        to: nextValue,
        label: relationshipLabel(nextValue),
        axes: nextProfile,
        moralFriction: (preview.moralAnalysis?.pairFriction ?? []).find((item) => item.heroIds.includes(first.id) && item.heroIds.includes(second.id)) ?? null,
      });
    }
  }

  const finalResultType = missionResultType({
    success,
    margin,
    deaths,
    injuries,
    capturedVillain,
    materialDamage: damage,
    outcome: outcomeText(success, margin, deaths, injuries),
  });
  const dialogue = await selectDialogue({
    event,
    team,
    relationships: nextRelationships,
    success,
    injuries,
    deaths,
    capturedVillain,
    recentDialogues,
    day,
    resultType: finalResultType,
  });
  const relationshipEffect = dialogue.effects?.relationshipChange ?? 0;
  const stressEffect = dialogue.effects?.stressChange ?? 0;
  const moralEffect = dialogue.effects?.moralChange ?? 0;
  if (relationshipEffect !== 0 && team.length > 1) {
    for (let i = 0; i < team.length; i += 1) {
      for (let j = 0; j < team.length; j += 1) {
        if (i === j) continue;
        const key = pairKey(team[i].id, team[j].id);
        nextRelationships[key] = adjustRelationshipProfile(nextRelationships[key], relationshipEffect);
      }
    }
  }
  if (stressEffect !== 0 || moralEffect !== 0) {
    heroUpdates.forEach((update) => {
      if (update.died) return;
      update.nextHero = {
        ...update.nextHero,
        estresse: clamp(update.nextHero.estresse + stressEffect, 0, 100),
        moral: clamp((update.nextHero.moral ?? 70) + moralEffect, 0, 100),
      };
      update.nextHero.status = heroOperationalStatus(update.nextHero);
    });
  }

  const budgetDelta = calculateMissionPayout({
    event,
    success,
    resultType: finalResultType,
    civiliansSaved: saved,
    capturedVillain,
    materialDamage: damage,
  });
  const rawReputationDelta = success
    ? Math.max(2, Math.round(event.nívelRisco * 2 + Math.max(0, margin) / 15 - deaths.length * 5 + comboEffects.reputationBonus))
    : -Math.max(3, Math.round(event.nívelRisco * 3 + Math.abs(margin) / 12 + deaths.length * 5));
  const upgradeShield = baseUpgradeEffect(baseUpgrades, "reputationShield");
  const reputationDelta = dispatcherReputationShield(dispatcher, rawReputationDelta < 0 ? Math.min(-1, rawReputationDelta + upgradeShield) : rawReputationDelta);

  return {
    id: missionId,
    day,
    event,
    heroIds: team.map((hero) => hero.id),
    heroNames: team.map((hero) => hero.codinome),
    chance: preview.chance,
    roll,
    success,
    resultType: finalResultType,
    outcome: outcomeText(success, margin, deaths, injuries),
    narrative: missionNarrative(event, team, success, preview.chance, deaths),
    reputationDelta,
    budgetDelta,
    civiliansSaved: saved,
    materialDamage: damage,
    experienceGain: success ? Math.round(7 + event.dificuldade / 9 + event.nívelRisco * 2) : Math.round(4 + event.nívelRisco * 1.5),
    heroUpdates,
    missionFacts,
    relationshipChanges,
    injuries,
    deaths,
    capturedVillain,
    dialogue,
    relationships: nextRelationships,
    breakdown: preview,
    activeCombos: preview.activeCombos ?? [],
    moralAnalysis: preview.moralAnalysis,
    emotionalConsequences: [
      deaths.length > 0 ? "luto coletivo por 3 dias" : null,
      injuries.length > 0 ? "enfermaria acionada" : null,
      relationshipEffect > 0 ? "a equipe saiu mais próxima" : relationshipEffect < 0 ? "a equipe saiu em atrito" : null,
      stressEffect < 0 ? "a cena reduziu a tensão da equipe" : stressEffect > 0 ? "a cena deixou nervos expostos" : null,
      preview.moralAnalysis?.tensionRisk >= 16 ? "conflito moral registrado" : null,
      preview.moralAnalysis?.bonus >= 4 ? "valores da equipe favoreceram a resposta" : null,
      missionFacts.some((fact) => fact.type === "hospital_saved") ? "hospital preservado por decisao de campo" : null,
      missionFacts.some((fact) => fact.type === "neighborhood_blackout") ? "apagão de bairro entrou no relatório" : null,
    ].filter(Boolean),
  };
};




