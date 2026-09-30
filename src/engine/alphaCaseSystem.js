import { alphaPackageCaseRecords, alphaPackageVillainIds } from "../data/alpha11_12/packageAdapters";
import { appendAuditEvent, deterministicRoll, makeAuditEvent } from "./seededRng";

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(Number(value) || 0)));

const currentTick = (state) => (state.day ?? 1) * 24 + (state.history?.length ?? 0) + (state.alphaEventLog?.length ?? 0);

export const caseIdForVillain = (villainId) => {
  const seed = alphaPackageCaseRecords.find((record) => record.villainId === villainId);
  return seed?.caseId ?? `CASE_${villainId}`;
};

export const initializeCaseRecords = (villains = []) => {
  const villainIds = new Set(villains.map((villain) => villain.id));
  return alphaPackageCaseRecords
    .filter((record) => villainIds.has(record.villainId))
    .map((record) => ({
      ...record,
      caseId: record.caseId ?? caseIdForVillain(record.villainId),
      status: record.status ?? "at_large",
      custody: {
        securityNeed: record.custody?.securityNeed ?? 35,
        escapeRisk: record.custody?.escapeRisk ?? 30,
        facilityId: record.custody?.facilityId ?? null,
        securityLevel: record.custody?.securityLevel ?? null,
        médicalNeeds: record.custody?.médicalNeeds ?? [],
        separationNeeds: record.custody?.separationNeeds ?? [],
        grievance: record.custody?.grievance ?? 20,
        stress: record.custody?.stress ?? 20,
        incidentIds: record.custody?.incidentIds ?? [],
        failedControls: record.custody?.failedControls ?? [],
      },
      interrogations: record.interrogations ?? [],
      intelIds: record.intelIds ?? [],
      rehabilitation: record.rehabilitation ?? {
        eligible: true,
        stage: "precontemplation",
        basePotential: 35,
        dimensions: {},
        goals: [],
        programIds: [],
        progressEventIds: [],
      },
      mentor: record.mentor ?? null,
      relapse: record.relapse ?? { currentRisk: 45, warningSigns: [], eventIds: [], safeguards: [] },
      informant: record.informant ?? null,
      auditLog: record.auditLog ?? [],
    }));
};

export const initializeAlphaCaseState = (villains = []) => ({
  caseRecords: initializeCaseRecords(villains),
  intelItems: [],
  interrogationSessions: [],
  progressReports: [],
  alphaEventLog: [
    makeAuditEvent({
      type: "ALPHA_PACKAGE_IMPORTED",
      summary: "Pacote Alpha 1.1/1.2 inicializado com dossiês ativos.",
      tick: 0,
      payload: { activeVillains: villains.filter((villain) => villain.isAlphaActiveVillain).length },
    }),
  ],
});

export const ensureAlphaCaseState = (state) => {
  const activeVillains = (state.villains ?? []).filter((villain) => alphaPackageVillainIds.includes(villain.id));
  const existingCaseIds = new Set((state.caseRecords ?? []).map((record) => record.caseId));
  const freshCases = initializeCaseRecords(activeVillains).filter((record) => !existingCaseIds.has(record.caseId));
  return {
    ...state,
    campaignSeed: state.campaignSeed ?? `central-${state.dispatcher?.callsign ?? state.dispatcher?.name ?? "seed"}`,
    caseRecords: [...(state.caseRecords ?? []), ...freshCases],
    intelItems: state.intelItems ?? [],
    interrogationSessions: state.interrogationSessions ?? [],
    progressReports: state.progressReports ?? [],
    alphaEventLog: state.alphaEventLog ?? [],
  };
};

export const getCaseForVillain = (state, villainId) =>
  (state.caseRecords ?? []).find((record) => record.villainId === villainId) ?? null;

export const getIntelForCase = (state, caseRecord) => {
  if (!caseRecord) return [];
  const ids = new Set(caseRecord.intelIds ?? []);
  return (state.intelItems ?? []).filter((item) => ids.has(item.id));
};

export const getSessionsForCase = (state, caseRecord) => {
  if (!caseRecord) return [];
  const ids = new Set(caseRecord.interrogations ?? []);
  return (state.interrogationSessions ?? []).filter((session) => ids.has(session.sessionId));
};

export const updateCaseRecord = (state, caseId, updater) => ({
  ...state,
  caseRecords: (state.caseRecords ?? []).map((record) => (record.caseId === caseId ? updater(record) : record)),
});

export const appendCaseAudit = (state, caseId, event) => {
  const next = updateCaseRecord(state, caseId, (record) => ({
    ...record,
    auditLog: [event, ...(record.auditLog ?? [])].slice(0, 80),
  }));
  return appendAuditEvent(next, event);
};

export const intakeCapturedVillainCase = (state, villainId, sourceMission = null) => {
  const prepared = ensureAlphaCaseState(state);
  const caseRecord = getCaseForVillain(prepared, villainId);
  if (!caseRecord) return prepared;
  const tick = currentTick(prepared);
  const event = makeAuditEvent({
    type: "CASE_INTAKE_COMPLETED",
    summary: "Entrada de custódia registrada com necessidades e controles iniciais.",
    day: prepared.day,
    tick,
    causationId: sourceMission?.id,
    correlationId: sourceMission?.id ?? `case-${caseRecord.caseId}-${tick}`,
    payload: { caseId: caseRecord.caseId, villainId },
  });
  const withCase = updateCaseRecord(prepared, caseRecord.caseId, (record) => ({
    ...record,
    status: "intake",
    custody: {
      ...record.custody,
      securityLevel: record.custody.securityLevel ?? (record.custody.securityNeed >= 75 ? "S4" : "S3"),
      facilityId: record.custody.facilityId ?? "central-holding",
    },
  }));
  return appendCaseAudit(withCase, caseRecord.caseId, event);
};

export const createIntelItem = ({ state, caseRecord, sourceType, sourceId, claim, confidence = 35, sensitivity = "medium", risks = [], unlocks = [] }) => {
  const tick = currentTick(state);
  const id = `intel-${caseRecord.caseId}-${tick}-${deterministicRoll({ seed: state.campaignSeed, namespace: "intel-id", correlationId: `${sourceId}:${claim}`, max: 9999 })}`;
  return {
    id,
    caseId: caseRecord.caseId,
    villainId: caseRecord.villainId,
    claim,
    sourceType,
    sourceId,
    dependencies: [],
    confidence: clamp(confidence),
    state: confidence >= 72 ? "actionable" : confidence >= 58 ? "corroborated" : confidence >= 42 ? "partially_corroborated" : "unverified",
    sensitivity,
    expiresAtDay: (state.day ?? 1) + 5,
    risks,
    unlocks,
    explanation: [`Origem: ${sourceType}`, `Confiança inicial ${clamp(confidence)}%`],
    createdAtTick: tick,
  };
};

export const corroborateIntel = (state, intelId, sourceType = "independent_review") => {
  const item = (state.intelItems ?? []).find((candidate) => candidate.id === intelId);
  if (!item) return { state, message: "Inteligência não encontrada." };
  const confidence = clamp(item.confidence + 18);
  const nextItem = {
    ...item,
    confidence,
    state: confidence >= 72 ? "actionable" : confidence >= 58 ? "corroborated" : "partially_corroborated",
    explanation: [...(item.explanation ?? []), `Corroborado por ${sourceType}: +18.`],
  };
  const event = makeAuditEvent({
    type: "INTEL_CORROBORATED",
    summary: "Alegação recebeu fonte independente.",
    day: state.day,
    tick: currentTick(state),
    causationId: intelId,
    correlationId: intelId,
    payload: { intelId, confidence },
  });
  return {
    state: appendAuditEvent(
      {
        ...state,
        intelItems: (state.intelItems ?? []).map((candidate) => (candidate.id === intelId ? nextItem : candidate)),
      },
      event,
    ),
    message: confidence >= 72 ? "Inteligência agora é acionável." : "Inteligência parcialmente corroborada.",
  };
};

export const computeCustodyPressure = (caseRecord) => {
  const custody = caseRecord?.custody ?? {};
  const security = Number(String(custody.securityLevel ?? "S1").replace("S", "")) || 1;
  const unmetNeeds = (custody.médicalNeeds?.length ?? 0) + (custody.separationNeeds?.length ?? 0);
  return clamp((custody.escapeRisk ?? 20) + (custody.grievance ?? 0) * 0.45 + unmetNeeds * 4 - security * 8);
};

export const maybeEscapeCase = (state, caseRecord, namespace = "custody-tick") => {
  if (!["captured", "intake", "holding", "interrogation", "rehabilitation", "informant_active"].includes(caseRecord.status)) return null;
  const pressure = computeCustodyPressure(caseRecord);
  const roll = deterministicRoll({
    seed: state.campaignSeed,
    namespace,
    correlationId: `${caseRecord.caseId}:${state.day}`,
    min: 1,
    max: 100,
  });
  if (roll > pressure || pressure < 64) return null;
  const failedControls = [
    caseRecord.custody?.securityLevel ? `nível ${caseRecord.custody.securityLevel} insuficiente` : "sem nível de segurança definido",
    ...(caseRecord.custody?.médicalNeeds?.length ? ["necessidade médica sem plano completo"] : []),
    ...(caseRecord.custody?.separationNeeds?.length ? ["separação ambiental incompleta"] : []),
  ];
  return {
    id: `escape-${caseRecord.caseId}-${state.day}`,
    type: "escape",
    villainId: caseRecord.villainId,
    caseId: caseRecord.caseId,
    day: state.day,
    vector: pressure >= 82 ? "explorou rotina de transferência" : "aproveitou falha de separação",
    pressure,
    roll,
    failedControls,
    outcome: "escaped",
  };
};

export const generateProgressReport = (state, caseRecord) => {
  const events = (caseRecord.auditLog ?? []).slice(0, 5);
  const intel = getIntelForCase(state, caseRecord);
  const dimensions = caseRecord.rehabilitation?.dimensions ?? {};
  const observations = [
    ...events.slice(0, 3).map((event) => ({
      sourceEventId: event.id,
      observedFact: event.summary,
      interpretation: "Evento usado como evidência, não como conclusão isolada.",
      confidence: 62,
      risk: caseRecord.relapse?.currentRisk ?? 40,
      recommendation: "Manter revisão supervisionada.",
    })),
    ...intel.slice(0, 2).map((item) => ({
      sourceEventId: item.sourceId,
      observedFact: item.claim,
      interpretation: `Alegação em estado ${item.state}.`,
      confidence: item.confidence,
      risk: item.risks?.[0] ?? "fonte pode estar incompleta",
      recommendation: item.confidence >= 70 ? "Pode orientar contramedida." : "Exigir corroboração antes de ação crítica.",
    })),
  ];
  const id = `report-${caseRecord.caseId}-${state.day}-${state.progressReports?.length ?? 0}`;
  return {
    id,
    caseId: caseRecord.caseId,
    villainId: caseRecord.villainId,
    day: state.day,
    stage: caseRecord.rehabilitation?.stage ?? "precontemplation",
    dimensions,
    observations,
    reportConfidence: observations.length ? Math.round(observations.reduce((sum, item) => sum + item.confidence, 0) / observations.length) : 40,
    mentorStatement: caseRecord.mentor ? "Mentoria requer limites claros e evidências de reparação." : "Sem mentor ativo.",
    subjectStatement: "Registro produzido a partir de eventos persistidos no caso.",
  };
};



