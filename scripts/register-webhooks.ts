import "dotenv/config";
import { registerWebhook, listWebhooks } from "../src/services/shopify.service.js";

const WEBHOOK_BASE_URL = process.argv[2];

if (!WEBHOOK_BASE_URL) {
  console.error("Usage: tsx scripts/register-webhooks.ts <BASE_URL>");
  console.error("Example: tsx scripts/register-webhooks.ts https://abc123.ngrok.io");
  process.exit(1);
}

const topics = [
  "ORDERS_CREATE",
  "ORDERS_UPDATED",
  "ORDERS_PAID",
  "ORDERS_CANCELLED",
  "REFUNDS_CREATE",
  "CUSTOMERS_CREATE",
  "CUSTOMERS_UPDATE",
  "APP_UNINSTALLED",
];

async function main() {
  console.log("Current webhooks:");
  const existing = await listWebhooks();
  console.log(JSON.stringify(existing, null, 2));

  console.log(`\nRegistering webhooks with base URL: ${WEBHOOK_BASE_URL}`);

  for (const topic of topics) {
    const callbackUrl = `${WEBHOOK_BASE_URL}/webhooks/${topic.toLowerCase().replace("_", "/")}`;
    console.log(`  ${topic} -> ${callbackUrl}`);

    try {
      const result = await registerWebhook(topic, callbackUrl);
      console.log(`  Result:`, JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`  Error registering ${topic}:`, err);
    }
  }

  console.log("\nDone. Current webhooks:");
  const updated = await listWebhooks();
  console.log(JSON.stringify(updated, null, 2));
}

main().catch(console.error);
