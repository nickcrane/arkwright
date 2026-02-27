import { Router } from "express";
import type { Request, Response } from "express";
import { webhookVerification } from "./verify.js";
import { dispatchWebhook } from "./dispatcher.js";
import { runAgent } from "../agent/agent.js";
import { logger } from "../utils/logger.js";

export function createWebhookRouter(webhookSecret: string) {
  const router = Router();

  router.use(webhookVerification(webhookSecret));

  router.post("/:topic(*)", async (req: Request, res: Response) => {
    const topic = req.get("X-Shopify-Topic") || String(req.params.topic);
    const webhookId = req.get("X-Shopify-Webhook-Id") || "";
    const shopDomain = req.get("X-Shopify-Shop-Domain") || "";

    logger.info({ topic, webhookId, shopDomain }, "Webhook received");

    // Respond immediately so Shopify doesn't retry
    res.status(200).json({ received: true });

    try {
      const event = await dispatchWebhook(topic, webhookId, req.body);
      if (event) {
        const result = await runAgent(event);
        logger.info(
          { topic, webhookId, outcome: result.outcome, summary: result.summary },
          "Agent completed webhook processing"
        );
      }
    } catch (error) {
      logger.error({ topic, webhookId, error }, "Error processing webhook");
    }
  });

  return router;
}
