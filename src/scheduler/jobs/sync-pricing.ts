import { runAgent } from "../../agent/agent.js";
import { listProducts } from "../../db/queries/products.queries.js";

export async function syncPricing() {
  const products = listProducts();
  const aliProducts = products.filter(
    (p) => p.supplierProductId && p.supplierName === "aliexpress"
  );

  if (aliProducts.length === 0) return;

  const productSummaries = aliProducts
    .map(
      (p) =>
        `- "${p.title}" (Shopify: ${p.id}, AliExpress: ${p.supplierProductId}) | ` +
        `Supplier: $${p.supplierPrice?.toFixed(2) ?? "?"} | Shopify: $${p.shopifyPrice?.toFixed(2) ?? "?"} | ` +
        `Margin: ${p.marginPercent?.toFixed(1) ?? "?"}% | Last synced: ${p.lastSyncedAt ?? "never"}`
    )
    .join("\n");

  await runAgent({
    type: "scheduled",
    source: "cron/sync-pricing",
    priority: "normal",
    prompt: `Perform a pricing sync for the following products:

${productSummaries}

For each product:
1. Call aliexpress_get_product to fetch the current supplier price
2. Compare against the stored supplier price and current Shopify price
3. Calculate the current margin: (shopifyPrice - supplierPrice) / shopifyPrice * 100
4. If margin has dropped below 30%, propose a Shopify price update to restore the target margin
5. If supplier price has increased by more than 15%, flag it as an alert
6. If supplier price has decreased, consider whether to lower the Shopify price to be more competitive (price guardrails will require approval for large drops)
7. Update product notes with any pricing changes observed
8. Post a summary to Slack when done`,
    context: { products: aliProducts },
  });
}
