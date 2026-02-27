import { getOrder, updateOrderStatus } from "../../db/queries/orders.queries.js";
import type { AgentEvent } from "../../agent/types.js";

export async function handleOrderPaid(
  payload: Record<string, unknown>
): Promise<AgentEvent> {
  const orderId = String(payload.id);
  const localOrder = getOrder(orderId);

  await updateOrderStatus(orderId, { financialStatus: "paid" });

  return {
    type: "webhook",
    source: "orders/paid",
    priority: "normal",
    prompt: `Payment confirmed for Order #${payload.order_number} (ID: ${orderId}).
Total: $${payload.total_price} ${payload.currency}.

${localOrder?.supplierOrderId ? `Supplier order already placed (${localOrder.supplierName}: ${localOrder.supplierOrderId}).` : "Supplier order has NOT been placed yet. If the order-created handler didn't place it (waiting for payment), please proceed with supplier fulfillment now."}

Please:
1. Record revenue if not already recorded
2. If supplier order is pending, place it now
3. Post a brief update to Slack`,
    context: { order: payload, localOrder },
  };
}
