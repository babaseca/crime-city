import injuryCatalog from "../data/injuries.json";
import { baseUpgradeEffect } from "./baseUpgradeSystem";
import { clamp, heroOperationalStatus } from "./mission";

const severityRank = { leve: 1, media: 2, grave: 3, critica: 4, permanente: 5 };

export const normalizeInjury = (injury) => ({
  ...injury,
  daysRemaining: injury.daysRemaining ?? injury.durationDays ?? 1,
  severity: injury.severity ?? "leve",
  treatmentCost: injury.treatmentCost ?? 900,
  statPenalties: injury.statPenalties ?? {},
});

export const normalizeHeroInjuries = (hero) => ({
  ...hero,
  injuries: (hero.injuries ?? hero.ferimentos ?? []).map(normalizeInjury),
  ferimentos: (hero.ferimentos ?? hero.injuries ?? []).map(normalizeInjury),
  medicalStatus: hero.medicalStatus ?? ((hero.ferimentos ?? hero.injuries ?? []).length ? "em_observacao" : "liberado"),
  recoveryDays: hero.recoveryDays ?? Math.max(0, ...(hero.ferimentos ?? hero.injuries ?? [{ daysRemaining: 0 }]).map((injury) => injury.daysRemaining ?? 0)),
});

const pickInjuryTemplate = (missionResult, riskLevel) => {
  const tags = missionResult.event?.tags ?? [];
  const severe = riskLevel >= 42 || !missionResult.success;
  const pool = injuryCatalog.filter((injury) => tags.some((tag) => injury.tags.includes(tag)) || (severe ? severityRank[injury.severity] >= 3 : severityRank[injury.severity] <= 3));
  return pool[(missionResult.day + riskLevel + tags.length) % Math.max(1, pool.length)] ?? injuryCatalog[0];
};

export const generateInjury = (missionResult, hero, riskLevel = 20) => {
  const template = pickInjuryTemplate(missionResult, riskLevel);
  return normalizeInjury({
    ...template,
    id: `injury-${template.id}-${hero.id}-${Date.now()}`,
    source: missionResult.event?.titulo ?? "Ocorrência de campo",
    day: missionResult.day,
  });
};

export const applyInjuryToHero = (hero, injury) => {
  const normalized = normalizeInjury(injury);
  const next = {
    ...normalizeHeroInjuries(hero),
    injuries: [...(hero.injuries ?? hero.ferimentos ?? []), normalized],
    ferimentos: [...(hero.ferimentos ?? hero.injuries ?? []), normalized],
    medicalStatus: severityRank[normalized.severity] >= 3 ? "bloqueado" : "em_observacao",
    recoveryDays: Math.max(hero.recoveryDays ?? 0, normalized.daysRemaining),
  };
  next.status = heroOperationalStatus(next);
  return next;
};

export const progressInjuryRecovery = (hero, baseUpgrades = []) => {
  const normalized = normalizeHeroInjuries(hero);
  const recoveryBonus = baseUpgradeEffect(baseUpgrades, "injuryRecoveryBonus");
  const nextInjuries = normalized.injuries
    .map((injury) => normalizeInjury({ ...injury, daysRemaining: (injury.daysRemaining ?? 1) - 1 - recoveryBonus }))
    .filter((injury) => injury.daysRemaining > 0);
  const next = {
    ...normalized,
    injuries: nextInjuries,
    ferimentos: nextInjuries,
    medicalStatus: nextInjuries.some((injury) => severityRank[injury.severity] >= 3) ? "bloqueado" : nextInjuries.length ? "em_observacao" : "liberado",
    recoveryDays: Math.max(0, ...nextInjuries.map((injury) => injury.daysRemaining ?? 0), 0),
  };
  next.status = heroOperationalStatus(next);
  return next;
};

export const calculateInjuryPenalty = (hero) => {
  const injuries = (hero.injuries ?? hero.ferimentos ?? []).map(normalizeInjury);
  return injuries.reduce(
    (total, injury) => total + Object.values(injury.statPenalties ?? {}).reduce((sum, value) => sum + Math.abs(value), 0) * 2 + (injury.riskIfDeployed ?? 0) * 0.25,
    0,
  );
};

export const canDeployInjuredHero = (hero, mission) => {
  const injuries = (hero.injuries ?? hero.ferimentos ?? []).map(normalizeInjury);
  if (!injuries.length) return { allowed: true, requiresConfirmation: false, reason: "" };
  const worst = Math.max(...injuries.map((injury) => severityRank[injury.severity] ?? 1));
  if (worst >= 4 && (mission?.nivelRisco ?? 0) < 5) {
    return { allowed: false, requiresConfirmation: true, reason: "Lesão crítica bloqueia despacho comum." };
  }
  return { allowed: true, requiresConfirmation: worst >= 2, reason: "Herói ferido terá penalidade e risco de agravamento." };
};

export const aggravateInjury = (hero, mission) => {
  const injuries = (hero.injuries ?? hero.ferimentos ?? []).map(normalizeInjury);
  if (!injuries.length) return hero;
  const risk = Math.min(75, (mission?.nivelRisco ?? 2) * 9 + calculateInjuryPenalty(hero));
  if (Math.random() * 100 > risk) return hero;
  const aggravated = injuries.map((injury, index) =>
    index === 0
      ? {
          ...injury,
          severity: injury.severity === "leve" ? "media" : injury.severity === "media" ? "grave" : injury.severity,
          daysRemaining: clamp((injury.daysRemaining ?? 1) + 2, 1, 12),
        }
      : injury,
  );
  return { ...hero, injuries: aggravated, ferimentos: aggravated, medicalStatus: "bloqueado" };
};
