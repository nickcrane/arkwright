import type { AgentEvent } from "./types.js";

export function buildContext(event: AgentEvent): string {
  const parts: string[] = [];

  parts.push(`[Event: ${event.source} | Priority: ${event.priority} | Type: ${event.type}]`);
  parts.push("");
  parts.push(event.prompt);

  if (event.context && Object.keys(event.context).length > 0) {
    // Only include non-prompt context if it adds value beyond what's in the prompt
    const contextKeys = Object.keys(event.context);
    if (contextKeys.length > 0) {
      parts.push("");
      parts.push("--- Additional Context (JSON) ---");
      // Truncate large payloads to avoid blowing up the context window
      const contextStr = JSON.stringify(event.context, null, 2);
      if (contextStr.length > 8000) {
        parts.push(contextStr.slice(0, 8000) + "\n... [truncated]");
      } else {
        parts.push(contextStr);
      }
    }
  }

  return parts.join("\n");
}
