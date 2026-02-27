import { runAgent } from "../../agent/agent.js";
import { getDb } from "../../db/client.js";
import { orders } from "../../db/schema.js";
import { eq, lte } from "drizzle-orm";
import { and } from "drizzle-orm";

export async function staleOrders() {
  const db = getDb();
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  const stale = db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending"),
        lte(orders.createdAt, fourHoursAgo)
      )
    )
    .all();

  if (stale.length === 0) return;

  const orderList = stale
    .map(
      (o) =>
        `- Order #${o.shopifyOrderNumber} (ID: ${o.id}), created ${o.createdAt}, payment: ${o.financialStatus}`
    )
    .join("\n");

  await runAgent({
    type: "scheduled",
    source: "cron/stale-orders",
    priority: "high",
    prompt: `The following orders have been in "pending" status for over 4 hours:

${orderList}

Please investigate each one:
1. Check if payment has been confirmed on Shopify
2. If paid but not fulfilled, attempt fulfillment now
3. If there's an issue preventing fulfillment, alert the owner on Slack
4. Save notes about what was found`,
    context: { staleOrders: stale },
  });
}
