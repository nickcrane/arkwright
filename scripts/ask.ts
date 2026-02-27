import "dotenv/config";
import { getDb } from "../src/db/client.js";
import { initLimits } from "../src/guardrails/spending-limits.js";
import { runAgent } from "../src/agent/agent.js";

const prompt = process.argv.slice(2).join(" ");

if (!prompt) {
  console.error("Usage: npm run ask -- <your message to Arkwright>");
  console.error('Example: npm run ask -- "Search AliExpress for graphic tees under $10 and suggest 5 products to list"');
  process.exit(1);
}

async function main() {
  getDb(process.env.DATABASE_PATH);

  initLimits({
    maxSingleOrderCost: Number(process.env.MAX_SINGLE_ORDER_COST) || 100,
    maxDailySpend: Number(process.env.MAX_DAILY_SPEND) || 500,
    maxRefundAmount: Number(process.env.MAX_REFUND_AMOUNT) || 30,
    minMarginPercent: Number(process.env.MIN_MARGIN_PERCENT) || 30,
    maxDiscountPercent: Number(process.env.MAX_DISCOUNT_PERCENT) || 10,
    maxPriceDropPercent: Number(process.env.MAX_PRICE_DROP_PERCENT) || 20,
    maxPriceIncreasePercent: Number(process.env.MAX_PRICE_INCREASE_PERCENT) || 50,
  });

  console.log(`\nAsking Arkwright: "${prompt}"\n`);

  const result = await runAgent({
    type: "manual",
    source: "cli/ask",
    priority: "normal",
    prompt,
    context: {},
  });

  console.log("\n--- Arkwright's Response ---\n");
  console.log(result.summary);
  console.log(`\n--- Stats: ${result.toolCalls.length} tool calls | ${result.inputTokens + result.outputTokens} tokens | ${(result.durationMs / 1000).toFixed(1)}s | ${result.outcome} ---`);
}

main().catch(console.error);
