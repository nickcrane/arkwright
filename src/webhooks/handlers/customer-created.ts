import type { AgentEvent } from "../../agent/types.js";

export async function handleCustomerCreated(
  payload: Record<string, unknown>
): Promise<AgentEvent> {
  const customer = payload as Record<string, unknown>;

  return {
    type: "webhook",
    source: "customers/create",
    priority: "low",
    prompt: `New customer registered: ${customer.first_name} ${customer.last_name} (${customer.email}).

Please save a note about this new customer. No further action needed unless they have placed an order.`,
    context: { customer: payload },
  };
}
