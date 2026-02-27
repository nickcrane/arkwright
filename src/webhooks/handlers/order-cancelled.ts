import { getOrder, updateOrderStatus } from "../../db/queries/orders.queries.js";
import type { AgentEvent } from "../../agent/types.js";

export async function handleOrderCancelled(
  payload: Record<string, unknown>
): Promise<AgentEvent> {
  const orderId = String(payload.id);
  const localOrder = getOrder(orderId);

  await updateOrderStatus(orderId, {
    status: "cancelled",
    financialStatus: String(payload.financial_status || "voided"),
  });

  return {
    type: "webhook",
    source: "orders/cancelled",
    priority: "high",
    prompt: `Order #${payload.order_number} (ID: ${orderId}) has been CANCELLED.
Reason: ${payload.cancel_reason || "Not specified"}

${localOrder?.supplierOrderId ? `WARNING: A supplier order was already placed (${localOrder.supplierName}: ${localOrder.supplierOrderId}). You may need to contact the supplier to cancel.` : "No supplier order was placed, so no supplier cancellation needed."}

Please:
1. If a supplier order exists, note that it needs cancellation and alert the owner
2. Record any refund adjustments in the ledger
3. Save a note about this cancellation
4. Post to Slack #arkwright-orders`,
    context: { order: payload, localOrder },
  };
}
