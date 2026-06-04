import { clamp, heroOperationalStatus } from "./mission";

export const calculateFatigue = (hero) =>
  clamp(Math.round((100 - (hero.energia ?? 90)) * 0.35 + (hero.estresse ?? 0) * 0.28 + (hero.overworkedCount ?? 0) * 8), 0, 100);

export const calculateBurnoutRisk = (hero) =>
  clamp(Math.round((hero.fatigue ?? calculateFatigue(hero)) * 0.55 + (hero.estresse ?? 0) * 0.35 + (hero.overworkedCount ?? 0) * 6), 0, 100);

export const applyMissionFatigue = (hero, missionResult) => {
  const critical = (missionResult.event?.nivelRisco ?? 0) >= 4 || ["falha grave", "sucesso com perda heroica"].includes(missionResult.outcome);
  const fatigueGain = Math.round((missionResult.event?.nivelRisco ?? 2) * 4 + (missionResult.success ? 4 : 9) + (critical ? 7 : 0));
  const next = {
    ...hero,
    fatigue: clamp((hero.fatigue ?? calculateFatigue(hero)) + fatigueGain, 0, 100),
    burnoutRisk: 0,
    restDays: 0,
    lastMissionDay: missionResult.day,
    overworkedCount: (hero.overworkedCount ?? 0) + 1,
  };
  next.burnoutRisk = calculateBurnoutRisk(next);
  next.status = heroOperationalStatus(next);
  return next;
};

export const applyRestRecovery = (hero) => {
  const next = {
    ...hero,
    energia: clamp((hero.energia ?? 0) + 16, 0, 100),
    estresse: clamp((hero.estresse ?? 0) - 8, 0, 100),
    fatigue: clamp((hero.fatigue ?? calculateFatigue(hero)) - 15, 0, 100),
    restDays: (hero.restDays ?? 0) + 1,
    overworkedCount: Math.max(0, (hero.overworkedCount ?? 0) - 1),
  };
  next.burnoutRisk = calculateBurnoutRisk(next);
  next.status = heroOperationalStatus(next);
  return next;
};

export const checkBurnoutEvents = (hero) => {
  const risk = calculateBurnoutRisk(hero);
  if (risk >= 85) return { heroId: hero.id, severity: "critico", text: `${hero.codinome} está perto de afastamento por burnout.` };
  if (risk >= 68) return { heroId: hero.id, severity: "alto", text: `${hero.codinome} precisa de descanso real antes da próxima sirene.` };
  return null;
};
