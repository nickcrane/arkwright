import * as shopify from "../../services/shopify.service.js";
import type { ToolDefinition } from "../../agent/types.js";

export const orderTools: ToolDefinition[] = [
  {
    name: "shopify_get_order",
    description: "Fetch a Shopify order by ID with line items, customer info, and fulfillment status",
    input_schema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "The Shopify order ID" },
      },
      required: ["orderId"],
    },
    execute: async (input) => shopify.getOrder(input.orderId as string),
  },
  {
    name: "shopify_list_orders",
    description: "List orders from the Shopify store with optional filters",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max orders to return (default 50)" },
        query: {
          type: "string",
          description: "Shopify query filter (e.g., 'fulfillment_status:unfulfilled')",
        },
      },
    },
    execute: async (input) =>
      shopify.listOrders(
        (input.limit as number) || 50,
        input.query as string | undefined
      ),
  },
  {
    name: "shopify_create_fulfillment",
    description: "Mark a Shopify order as fulfilled with tracking information",
    input_schema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "The Shopify order ID" },
        trackingNumber: { type: "string", description: "Shipping tracking number" },
        trackingCompany: { type: "string", description: "Shipping carrier name" },
        trackingUrl: { type: "string", description: "Tracking URL" },
      },
      required: ["orderId", "trackingNumber", "trackingCompany"],
    },
    execute: async (input) =>
      shopify.createFulfillment(input.orderId as string, {
        number: input.trackingNumber as string,
        company: input.trackingCompany as string,
        url: (input.trackingUrl as string) || "",
      }),
  },
  {
    name: "shopify_create_refund",
    description: "Issue a refund for a Shopify order. Check spending limits first.",
    input_schema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "The Shopify order ID" },
        lineItems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              lineItemId: { type: "string" },
              quantity: { type: "number" },
            },
            required: ["lineItemId", "quantity"],
          },
        },
        note: { type: "string", description: "Reason for refund" },
      },
      required: ["orderId", "lineItems"],
    },
    execute: async (input) =>
      shopify.createRefund(
        input.orderId as string,
        input.lineItems as Array<{ lineItemId: string; quantity: number }>,
        input.note as string | undefined
      ),
  },
];
