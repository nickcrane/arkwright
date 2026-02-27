import "dotenv/config";
import express from "express";
import { logger } from "./utils/logger.js";
import { getDb } from "./db/client.js";
import { createWebhookRouter } from "./webhooks/router.js";
import { initSlack, startSlack } from "./services/slack.service.js";
import { initLimits } from "./guardrails/spending-limits.js";
import { startScheduler } from "./scheduler/cron.js";
import { exchangeCodeForToken, getAuthUrl } from "./services/aliexpress.service.js";

// Validate required env vars early
const required = [
  "ANTHROPIC_API_KEY",
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SHOPIFY_STORE_DOMAIN",
  "SHOPIFY_ACCESS_TOKEN",
  "SHOPIFY_WEBHOOK_SECRET",
  "SLACK_BOT_TOKEN",
  "SLACK_SIGNING_SECRET",
  "SLACK_APP_TOKEN",
  "SLACK_OWNER_USER_ID",
  "SLACK_CHANNEL_LOG",
  "SLACK_CHANNEL_ORDERS",
  "SLACK_CHANNEL_APPROVALS",
  "SLACK_CHANNEL_ALERTS",
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`Missing required env vars:\n${missing.map((k) => `  - ${k}`).join("\n")}`);
  console.error("\nCopy .env.example to .env and fill in the values.");
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  // Initialize database
  getDb(process.env.DATABASE_PATH);
  logger.info("Database initialized");

  // Initialize spending limits
  initLimits({
    maxSingleOrderCost: Number(process.env.MAX_SINGLE_ORDER_COST) || 100,
    maxDailySpend: Number(process.env.MAX_DAILY_SPEND) || 500,
    maxRefundAmount: Number(process.env.MAX_REFUND_AMOUNT) || 30,
    minMarginPercent: Number(process.env.MIN_MARGIN_PERCENT) || 30,
    maxDiscountPercent: Number(process.env.MAX_DISCOUNT_PERCENT) || 10,
    maxPriceDropPercent: Number(process.env.MAX_PRICE_DROP_PERCENT) || 20,
    maxPriceIncreasePercent: Number(process.env.MAX_PRICE_INCREASE_PERCENT) || 50,
  });

  // Set up Express
  const app = express();

  // Parse JSON with raw body preserved for HMAC verification
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody: Buffer }).rawBody = buf;
      },
    })
  );

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", agent: "arkwright", version: "0.1.0" });
  });

  // AliExpress OAuth flow
  app.get("/aliexpress/auth", (req, res) => {
    const callbackUrl = `${req.protocol}://${req.get("host")}/aliexpress/callback`;
    const authUrl = getAuthUrl(callbackUrl);
    logger.info({ authUrl }, "Redirecting to AliExpress OAuth");
    res.redirect(authUrl);
  });

  app.get("/aliexpress/callback", async (req, res) => {
    const code = req.query.code as string;
    if (!code) {
      res.status(400).json({ error: "Missing 'code' query parameter" });
      return;
    }

    try {
      const token = await exchangeCodeForToken(code);
      logger.info("AliExpress token exchanged successfully");
      res.json({
        message: "Token obtained. Update your .env ALIEXPRESS_ACCESS_TOKEN with the value below, then restart the server.",
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
        expires_in: token.expiresIn,
        user_id: token.userId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err: msg }, "AliExpress token exchange failed");
      res.status(500).json({ error: msg });
    }
  });

  // Shopify webhook routes
  app.use("/webhooks", createWebhookRouter(process.env.SHOPIFY_WEBHOOK_SECRET!));

  // Start Express server
  app.listen(PORT, () => {
    logger.info({ port: PORT }, "Arkwright server started");
  });

  // Start Slack (Socket Mode)
  try {
    initSlack();
    await startSlack();
    logger.info("Slack connected");
  } catch (err) {
    logger.error({ err }, "Failed to start Slack - continuing without it");
  }

  // Start scheduled jobs
  startScheduler();

  logger.info("Arkwright is ready and listening for events");
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start Arkwright");
  process.exit(1);
});
