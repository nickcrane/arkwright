import * as ledgerDb from "../../db/queries/ledger.queries.js";
import type { ToolDefinition } from "../../agent/types.js";

export const ledgerTools: ToolDefinition[] = [
  {
    name: "ledger_record_expense",
    description: "Record a business expense (supplier order, shipping cost, subscription, etc.)",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Expense amount in USD" },
        category: {
          type: "string",
          enum: ["product_cost", "shipping", "subscription", "other"],
          description: "Expense category",
        },
        description: { type: "string", description: "What this expense is for" },
        orderId: { type: "string", description: "Related Shopify order ID (if applicable)" },
        productId: { type: "string", description: "Related product ID (if applicable)" },
      },
      required: ["amount", "category", "description"],
    },
    execute: async (input) =>
      ledgerDb.recordEntry({
        type: "expense",
        amount: input.amount as number,
        category: input.category as string,
        description: input.description as string,
        orderId: input.orderId as string | undefined,
        productId: input.productId as string | undefined,
      }),
  },
  {
    name: "ledger_record_revenue",
    description: "Record revenue from a sale",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Revenue amount in USD" },
        orderId: { type: "string", description: "Shopify order ID" },
        description: { type: "string", description: "Description of the sale" },
      },
      required: ["amount", "orderId", "description"],
    },
    execute: async (input) =>
      ledgerDb.recordEntry({
        type: "revenue",
        amount: input.amount as number,
        category: "sale",
        description: input.description as string,
        orderId: input.orderId as string,
      }),
  },
  {
    name: "ledger_record_refund",
    description: "Record a refund (negative revenue)",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Refund amount in USD" },
        orderId: { type: "string", description: "Related order ID" },
        description: { type: "string" },
      },
      required: ["amount", "orderId", "description"],
    },
    execute: async (input) =>
      ledgerDb.recordEntry({
        type: "refund",
        amount: input.amount as number,
        category: "refund",
        description: input.description as string,
        orderId: input.orderId as string,
      }),
  },
  {
    name: "ledger_get_balance",
    description: "Get current financial summary: total revenue, expenses, refunds, and net profit",
    input_schema: {
      type: "object",
      properties: {},
    },
    execute: async () => ledgerDb.getBalance(),
  },
  {
    name: "ledger_get_report",
    description: "Get a detailed financial report for a date range",
    input_schema: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date in ISO format (e.g., 2026-02-01)",
        },
        endDate: {
          type: "string",
          description: "End date in ISO format (e.g., 2026-02-28)",
        },
      },
      required: ["startDate", "endDate"],
    },
    execute: async (input) =>
      ledgerDb.getReport(input.startDate as string, input.endDate as string),
  },
];
