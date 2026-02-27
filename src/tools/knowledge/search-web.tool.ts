import { webSearch } from "../../services/search.service.js";
import type { ToolDefinition } from "../../agent/types.js";

export const searchWebTools: ToolDefinition[] = [
  {
    name: "search_web",
    description: "Search the web for product information, supplier details, market research, or any other business intelligence",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        count: {
          type: "number",
          description: "Number of results (default 5, max 10)",
        },
      },
      required: ["query"],
    },
    execute: async (input) =>
      webSearch(input.query as string, Math.min((input.count as number) || 5, 10)),
  },
];
