import { getInvocationCountLastHour } from "../db/queries/audit.queries.js";
import { logger } from "../utils/logger.js";

let activeInvocations = 0;
const MAX_CONCURRENT = 3;

export function checkRateLimit(maxPerHour: number): {
  allowed: boolean;
  reason?: string;
} {
  const count = getInvocationCountLastHour();
  if (count >= maxPerHour) {
    logger.warn({ count, maxPerHour }, "Hourly rate limit reached");
    return {
      allowed: false,
      reason: `Rate limit: ${count}/${maxPerHour} invocations this hour`,
    };
  }

  if (activeInvocations >= MAX_CONCURRENT) {
    return {
      allowed: false,
      reason: `Concurrency limit: ${activeInvocations}/${MAX_CONCURRENT} active`,
    };
  }

  return { allowed: true };
}

export function trackInvocationStart() {
  activeInvocations++;
}

export function trackInvocationEnd() {
  activeInvocations = Math.max(0, activeInvocations - 1);
}
