import * as shopify from "../../services/shopify.service.js";
import type { ToolDefinition } from "../../agent/types.js";

export const inventoryTools: ToolDefinition[] = [
  {
    name: "shopify_adjust_inventory",
    description: "Adjust inventory quantity for a product variant at a location",
    input_schema: {
      type: "object",
      properties: {
        inventoryItemId: { type: "string", description: "Shopify inventory item ID" },
        locationId: { type: "string", description: "Shopify location ID" },
        delta: {
          type: "number",
          description: "Quantity to add (positive) or remove (negative)",
        },
        reason: { type: "string", description: "Reason for adjustment" },
      },
      required: ["inventoryItemId", "locationId", "delta"],
    },
    execute: async (input) =>
      shopify.adjustInventory(
        input.inventoryItemId as string,
        input.locationId as string,
        input.delta as number,
        (input.reason as string) || "correction"
      ),
  },
];
