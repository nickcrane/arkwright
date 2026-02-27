import { logAgentRun } from "../db/queries/audit.queries.js";
import { sendMessage } from "../services/slack.service.js";
import { logger } from "../utils/logger.js";
import type { AgentEvent, AgentResult } from "../agent/types.js";

export async function auditAgentRun(event: AgentEvent, result: AgentResult) {
  const entry = logAgentRun({
    eventType: event.type,
    eventSource: event.source,
    agentModel: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
    toolCalls: JSON.stringify(result.toolCalls),
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    totalCostUsd: estimateCost(result.inputTokens, result.outputTokens),
    durationMs: result.durationMs,
    outcome: result.outcome,
    summary: result.summary,
  });

  // Post to audit channel
  try {
    await sendMessage(process.env.SLACK_CHANNEL_LOG!, {
      text: `[${event.source}] ${result.outcome}: ${result.summary} (${result.toolCalls.length} tools, ${result.durationMs}ms, ~$${estimateCost(result.inputTokens, result.outputTokens).toFixed(4)})`,
    });
  } catch {
    logger.warn("Failed to post audit log to Slack");
  }

  return entry;
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  // Sonnet 4 pricing: $3/1M input, $15/1M output
  return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
}
