const hashString = (value = "") => {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const deterministicRoll = ({ seed = "central-crise", namespace = "default", correlationId = "0", min = 0, max = 99 } = {}) => {
  const hash = hashString(`${seed}:${namespace}:${correlationId}`);
  const span = Math.max(1, max - min + 1);
  return min + (hash % span);
};

export const deterministicFloat = (params = {}) => deterministicRoll({ ...params, min: 0, max: 1000000 }) / 1000000;

export const createCampaignSeed = (dispatcher = {}) =>
  `seed-${hashString(`${dispatcher.name ?? "dispatcher"}:${dispatcher.callsign ?? dispatcher.codename ?? "central"}:${Date.now()}`).toString(36)}`;

export const makeAuditEvent = ({
  type,
  summary,
  actorId = "SYSTEM",
  day = 1,
  tick = 0,
  causationId = null,
  correlationId = null,
  payload = {},
} = {}) => ({
  id: `evt-${type}-${day}-${tick}-${hashString(`${type}:${summary}:${correlationId ?? causationId ?? ""}`).toString(36)}`,
  day,
  tick,
  eventType: type,
  type,
  summary,
  actorId,
  causationId,
  correlationId: correlationId ?? causationId ?? `corr-${day}-${tick}`,
  payload,
  createdAt: new Date().toISOString(),
});

export const appendAuditEvent = (state, event) => ({
  ...state,
  alphaEventLog: [event, ...(state.alphaEventLog ?? [])].slice(0, 300),
});

