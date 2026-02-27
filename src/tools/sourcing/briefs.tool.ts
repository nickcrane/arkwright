import crypto from "node:crypto";
import {
  createBrief,
  listActiveBriefs,
  getBrief,
  updateBrief,
} from "../../db/queries/sourcing.queries.js";
import type { ToolDefinition } from "../../agent/types.js";

export const sourcingTools: ToolDefinition[] = [
  {
    name: "sourcing_create_brief",
    description:
      "Create a new product sourcing brief that defines what type of products to find on AliExpress",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short title for the brief (e.g. 'Vintage Band Tees')" },
        description: {
          type: "string",
          description:
            "Detailed description of the niche/style to source — keywords, aesthetic, target audience",
        },
        targetMarginPercent: {
          type: "number",
          description: "Target profit margin percentage (e.g. 40)",
        },
        maxSupplierPrice: {
          type: "number",
          description: "Maximum acceptable supplier price in USD",
        },
        minSupplierPrice: {
          type: "number",
          description: "Minimum supplier price in USD (avoid very cheap / low-quality)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Shopify tags to apply to sourced products",
        },
        maxProducts: {
          type: "number",
          description: "Maximum number of products to source for this brief (default 10)",
        },
        priority: {
          type: "number",
          description: "Priority level (higher = sourced first, default 1)",
        },
      },
      required: ["title", "description", "targetMarginPercent"],
    },
    execute: async (input) => {
      const tags = input.tags as string[] | undefined;
      return createBrief({
        id: crypto.randomUUID(),
        title: input.title as string,
        description: input.description as string,
        targetMarginPercent: input.targetMarginPercent as number,
        maxSupplierPrice: (input.maxSupplierPrice as number) ?? null,
        minSupplierPrice: (input.minSupplierPrice as number) ?? null,
        tags: tags ? tags.join(",") : null,
        maxProducts: (input.maxProducts as number) || 10,
        priority: (input.priority as number) || 1,
        status: "active",
        currentProducts: 0,
        createdAt: "",
        updatedAt: "",
      });
    },
  },
  {
    name: "sourcing_list_briefs",
    description: "List all active product sourcing briefs",
    input_schema: {
      type: "object",
      properties: {},
    },
    execute: async () => listActiveBriefs(),
  },
  {
    name: "sourcing_get_brief",
    description: "Get a specific sourcing brief by ID",
    input_schema: {
      type: "object",
      properties: {
        briefId: { type: "string", description: "The sourcing brief ID" },
      },
      required: ["briefId"],
    },
    execute: async (input) => getBrief(input.briefId as string),
  },
  {
    name: "sourcing_update_brief",
    description:
      "Update an existing sourcing brief (change status, adjust constraints, etc.)",
    input_schema: {
      type: "object",
      properties: {
        briefId: { type: "string", description: "The sourcing brief ID" },
        title: { type: "string" },
        description: { type: "string" },
        targetMarginPercent: { type: "number" },
        maxSupplierPrice: { type: "number" },
        minSupplierPrice: { type: "number" },
        tags: { type: "array", items: { type: "string" } },
        status: {
          type: "string",
          enum: ["active", "paused", "completed"],
          description: "Brief status",
        },
        maxProducts: { type: "number" },
        priority: { type: "number" },
      },
      required: ["briefId"],
    },
    execute: async (input) => {
      const { briefId, tags, ...fields } = input;
      const updateFields: Record<string, unknown> = { ...fields };
      if (tags) {
        updateFields.tags = (tags as string[]).join(",");
      }
      await updateBrief(briefId as string, updateFields);
      return getBrief(briefId as string);
    },
  },
];
