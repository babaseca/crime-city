import approaches from "../data/interrogationApproaches.json";
import { appendCaseAudit, createIntelItem, ensureAlphaCaseState, getCaseForVillain, updateCaseRecord } from "./alphaCaseSystem";
import { deterministicRoll, makeAuditEvent } from "./seededRng";
import { normalizeVillainLifecycle } from "./villainLifecycleSystem";

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(Number(value) || 0)));

const pressureForApproach = (approachId) => {
  if (["pressao_controlada", "controlled_pressure"].includes(approachId)) return 18;
  if (["blefe", "deception"].includes(approachId)) return 12;
  return 0;
};

export const performInterrogation = (gameState, villainId, approachId = "tecnica") => {
  const prepared = ensureAlphaCaseState(gameState);
  const approach = approaches.find((candidate) => candidate.id === approachId) ?? approaches[0];
  const villain = prepared.villains.find((candidate) => candidate.id === villainId);
  const caseRecord = getCaseForVillain(prepared, villainId);
  if (!villain) return { state: prepared, message: "Dossie não encontrado." };

  const dispatcherScore = prepared.dispatcher?.attributes?.[approach.attribute] ?? 5;
  const normalized = normalizeVillainLifecycle(villain);
  const pressure = pressureForApproach(approachId);
  const rapport = ["rapport", "tecnica"].includes(approachId) ? 12 : 0;
  const cooperation = clamp(35 + dispatcherScore * 4 + rapport + pressure - (normalized.grudgeAgainstCentral ?? 20) * 0.2);
  const truthReliability = clamp(42 + (approach.truthBonus ?? 0) + dispatcherScore * 3 + rapport - pressure * 1.3 - (approachId === "deception" ? 18 : 0));
  const legalValidity = clamp(82 - pressure * 1.6 - (approachId === "deception" ? 28 : 0));
  const intelYield = clamp(cooperation * 0.55 + dispatcherScore * 3 + pressure * 0.4);
  const sessionId = `session-${villainId}-${prepared.day}-${prepared.interrogationSessions?.length ?? 0}`;
  const roll = deterministicRoll({
    seed: prepared.campaignSeed,
    namespace: "interrogation",
    correlationId: `${villainId}:${approachId}:${prepared.day}:${caseRecord?.interrogations?.length ?? 0}`,
    min: 1,
    max: 100,
  });
  const falseIntelPossible = cooperation >= 45 && truthReliability < 46;
  const yieldsIntel = roll <= intelYield;
  const intel =
    yieldsIntel && caseRecord
      ? createIntelItem({
          state: prepared,
          caseRecord,
          sourceType: "interrogation",
          sourceId: sessionId,
          claim: falseIntelPossible
            ? `${villain.alcunha} ofereceu uma versão possivelmente plantada sobre a próxima operação.`
            : `${villain.alcunha} descreveu uma rota operacional ligada a ${villain.faccao ?? "uma facção"}.`,
          confidence: truthReliability - (falseIntelPossible ? 18 : 0),
          risks: falseIntelPossible ? ["false_intel_possible", "source_motivation_unclear"] : ["requires_corroboration"],
          unlocks: truthReliability >= 70 ? [`countermeasure-${villain.id}`] : [],
        })
      : null;

  const session = {
    sessionId,
    caseId: caseRecord?.caseId,
    villainId,
    day: prepared.day,
    approachId,
    approachLabel: approach.label ?? approachId,
    cooperation,
    truthReliability,
    intelYield,
    legalValidity,
    costs: {
      grudge: approach.grudgeChange ?? 0,
      legalRisk: Math.max(0, 70 - legalValidity),
      moralCost: Math.max(0, pressure - 8),
    },
    generatedIntelIds: intel ? [intel.id] : [],
    falseIntelPossible,
    roll,
  };

  const event = makeAuditEvent({
    type: "INTERROGATION_SESSION_RESOLVED",
    summary: intel ? "Sessão gerou inteligência com proveniência." : "Sessão registrada sem inteligência acionável.",
    day: prepared.day,
    tick: (prepared.alphaEventLog?.length ?? 0) + 1,
    causationId: caseRecord?.caseId,
    correlationId: sessionId,
    payload: session,
  });

  let nextState = {
    ...prepared,
    discoveredClues: intel ? [...new Set([...(prepared.discoveredClues ?? []), `pista-${villain.id}-${prepared.day}`])] : prepared.discoveredClues,
    interrogationSessions: [session, ...(prepared.interrogationSessions ?? [])].slice(0, 200),
    intelItems: intel ? [intel, ...(prepared.intelItems ?? [])].slice(0, 300) : prepared.intelItems ?? [],
    villains: prepared.villains.map((record) =>
      record.id === villainId
        ? {
            ...normalized,
            grudgeAgainstCentral: clamp(normalized.grudgeAgainstCentral + (approach.grudgeChange ?? 0) + Math.max(0, pressure - 8)),
            historicoEncontros: [
              ...(normalized.historicoEncontros ?? []),
              {
                day: prepared.day,
                eventTitle: `Interrogatório ${approach.label ?? approachId}`,
                result: intel ? "gerou inteligência com fonte registrada" : "resposta sem corroboração",
                heroes: [],
              },
            ],
          }
        : record,
    ),
  };

  if (caseRecord) {
    nextState = updateCaseRecord(nextState, caseRecord.caseId, (record) => ({
      ...record,
      status: "interrogation",
      interrogations: [sessionId, ...(record.interrogations ?? [])].slice(0, 40),
      intelIds: intel ? [intel.id, ...(record.intelIds ?? [])] : record.intelIds ?? [],
      custody: {
        ...record.custody,
        stress: clamp((record.custody?.stress ?? 20) + Math.max(1, Math.round(pressure / 3))),
        grievance: clamp((record.custody?.grievance ?? 20) + Math.max(0, pressure - 8)),
      },
    }));
    nextState = appendCaseAudit(nextState, caseRecord.caseId, event);
  }

  return {
    state: nextState,
    message: intel
      ? `${villain.alcunha} entregou inteligência ${intel.state}; confiança ${intel.confidence}%.`
      : `${villain.alcunha} cooperou ${cooperation}%, mas nada acionável foi confirmado.`,
  };
};



