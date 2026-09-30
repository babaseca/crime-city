const envFlag = import.meta.env?.VITE_USE_ALPHA100_EVENTS;

export const USE_ALPHA100_EVENTS =
  envFlag === undefined ? true : !["0", "false", "off", "no"].includes(String(envFlag).toLowerCase());
