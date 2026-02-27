import * as shopify from "../../services/shopify.service.js";
import type { ToolDefinition } from "../../agent/types.js";

export const customerTools: ToolDefinition[] = [
  {
    name: "shopify_get_customer",
    description: "Fetch customer details from Shopify including order history and tags",
    input_schema: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "The Shopify customer ID" },
      },
      required: ["customerId"],
    },
    execute: async (input) => shopify.getCustomer(input.customerId as string),
  },
];
