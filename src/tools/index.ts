import { productTools } from "./shopify/products.tool.js";
import { orderTools } from "./shopify/orders.tool.js";
import { customerTools } from "./shopify/customers.tool.js";
import { inventoryTools } from "./shopify/inventory.tool.js";
import { aliexpressTools } from "./suppliers/aliexpress.tool.js";
import { slackTools } from "./communication/slack.tool.js";
import { notesTools } from "./knowledge/notes.tool.js";
import { searchWebTools } from "./knowledge/search-web.tool.js";
import { ledgerTools } from "./finance/ledger.tool.js";
import { sourcingTools } from "./sourcing/briefs.tool.js";
import type { ToolDefinition } from "../agent/types.js";

export const allTools: ToolDefinition[] = [
  ...productTools,
  ...orderTools,
  ...customerTools,
  ...inventoryTools,
  ...aliexpressTools,
  ...slackTools,
  ...notesTools,
  ...searchWebTools,
  ...ledgerTools,
  ...sourcingTools,
];

// Build a lookup map for fast tool resolution
export const toolMap = new Map<string, ToolDefinition>(
  allTools.map((t) => [t.name, t])
);
