import type { AgentEvent } from "../../agent/types.js";

export async function handleRefundCreated(
  payload: Record<string, unknown>
): Promise<AgentEvent> {
  const refund = payload as Record<string, unknown>;
  const orderId = String(refund.order_id);

  const refundLineItems = (refund.refund_line_items as Array<Record<string, unknown>>) || [];
  const totalRefunded = refundLineItems.reduce(
    (sum, item) => sum + Number(item.subtotal || 0),
    0
  );

  return {
    type: "webhook",
    source: "refunds/create",
    priority: "high",
    prompt: `A refund has been issued for Order #${orderId}.
Refund amount: $${totalRefunded}
Refund ID: ${refund.id}

Items refunded:
${refundLineItems.map((item) => `- ${item.quantity}x (subtotal: $${item.subtotal})`).join("\n")}

Please:
1. Record the refund in the ledger
2. Save a note about this refund with the reason
3. Alert the owner on Slack with refund details and updated margin for this order`,
    context: { refund: payload },
  };
}
