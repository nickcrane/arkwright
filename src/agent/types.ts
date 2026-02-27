export interface AgentEvent {
  type: "webhook" | "scheduled" | "manual";
  source: string;
  prompt: string;
  context: Record<string, unknown>;
  priority: "low" | "normal" | "high" | "urgent";
}

export interface AgentResult {
  summary: string;
  toolCalls: ToolCallRecord[];
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  outcome: "success" | "partial" | "error" | "approval_pending";
}

export interface ToolCallRecord {
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  durationMs: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}
