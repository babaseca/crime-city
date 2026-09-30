import { USE_ALPHA100_EVENTS } from "../config/featureFlags";
import { eventCount as legacyEventCount } from "./events";
import { alpha100EventCount } from "./alpha100/events_500";

export const activeEventCount = USE_ALPHA100_EVENTS ? alpha100EventCount : legacyEventCount;
