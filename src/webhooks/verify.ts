import type { Request, Response, NextFunction } from "express";
import { verifyShopifyWebhook } from "../utils/hmac.js";
import { logger } from "../utils/logger.js";

export function webhookVerification(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const hmacHeader = req.get("X-Shopify-Hmac-SHA256");
    if (!hmacHeader) {
      logger.warn("Missing HMAC header on webhook request");
      res.status(401).json({ error: "Missing HMAC header" });
      return;
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      logger.error("Raw body not available for HMAC verification");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (!verifyShopifyWebhook(rawBody, hmacHeader, secret)) {
      logger.warn("Invalid HMAC signature on webhook");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    next();
  };
}
