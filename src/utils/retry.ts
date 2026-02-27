import { logger } from "./logger.js";

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, label = "operation" } = opts;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn({ attempt, delay, label, error }, "Retrying after error");
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("Unreachable");
}
