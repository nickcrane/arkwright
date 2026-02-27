import { logger } from "../utils/logger.js";
import { isWebhookProcessed, markWebhookProcessed } from "../db/queries/audit.queries.js";
import { handleOrderCreated } from "./handlers/order-created.js";
import { handleOrderPaid } from "./handlers/order-paid.js";
import { handleOrderCancelled } from "./handlers/order-cancelled.js";
import { handleRefundCreated } from "./handlers/refund-created.js";
import { handleCustomerCreated } from "./handlers/customer-created.js";
import type { AgentEvent } from "../agent/types.js";

type WebhookHandler = (payload: Record<string, unknown>) => Promise<AgentEvent>;

const handlers: Record<string, WebhookHandler> = {
  "orders/create": handleOrderCreated,
  "orders/paid": handleOrderPaid,
  "orders/cancelled": handleOrderCancelled,
  "refunds/create": handleRefundCreated,
  "customers/create": handleCustomerCreated,
};

export async function dispatchWebhook(
  topic: string,
  webhookId: string,
  payload: Record<string, unknown>
): Promise<AgentEvent | null> {
  if (isWebhookProcessed(webhookId)) {
    logger.info({ webhookId, topic }, "Webhook already processed, skipping");
    return null;
  }

  const handler = handlers[topic];
  if (!handler) {
    logger.warn({ topic }, "No handler registered for webhook topic");
    return null;
  }

  logger.info({ topic, webhookId }, "Dispatching webhook");

  const event = await handler(payload);
  await markWebhookProcessed(webhookId, topic);

  return event;
}
