import { runAgent } from "../../agent/agent.js";
import { getDb } from "../../db/client.js";
import { orders } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export async function checkShipments() {
  const db = getDb();
  const processingOrders = db
    .select()
    .from(orders)
    .where(eq(orders.status, "processing"))
    .all();

  if (processingOrders.length === 0) return;

  const orderSummaries = processingOrders
    .map(
      (o) =>
        `- Order #${o.shopifyOrderNumber} (ID: ${o.id}): Supplier ${o.supplierName}, Supplier Order: ${o.supplierOrderId}`
    )
    .join("\n");

  await runAgent({
    type: "scheduled",
    source: "cron/check-shipments",
    priority: "normal",
    prompt: `Check tracking status for the following orders that are currently being processed:

${orderSummaries}

For each order:
1. Use aliexpress_get_tracking to check tracking status
2. If tracking is now available, update the Shopify fulfillment with the tracking info
3. If an order has been in "processing" for more than 5 days without tracking, flag it as an issue
4. Post updates to Slack #arkwright-orders`,
    context: { orders: processingOrders },
  });
}
