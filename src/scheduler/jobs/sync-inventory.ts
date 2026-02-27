import { runAgent } from "../../agent/agent.js";
import { listProducts } from "../../db/queries/products.queries.js";

export async function syncInventory() {
  const products = listProducts();
  const supplierProducts = products.filter((p) => p.supplierProductId);

  if (supplierProducts.length === 0) return;

  const productSummaries = supplierProducts
    .map(
      (p) =>
        `- "${p.title}" (Shopify: ${p.id}, Supplier: ${p.supplierName} ${p.supplierProductId}) | ` +
        `Supplier: $${p.supplierPrice?.toFixed(2) ?? "?"} | Shopify: $${p.shopifyPrice?.toFixed(2) ?? "?"} | ` +
        `Margin: ${p.marginPercent?.toFixed(1) ?? "?"}% | Last synced: ${p.lastSyncedAt ?? "never"}`
    )
    .join("\n");

  await runAgent({
    type: "scheduled",
    source: "cron/sync-inventory",
    priority: "low",
    prompt: `Perform a combined inventory and pricing sync for these products:

${productSummaries}

For each product:
1. Use aliexpress_get_product to check supplier availability and current pricing
2. If a product is out of stock at the supplier, update the Shopify listing to draft/unavailable
3. Compare the current supplier price against the stored supplier price and Shopify price
4. Calculate the current margin: (shopifyPrice - supplierPrice) / shopifyPrice * 100
5. If margin has dropped below 30%, propose a Shopify price update to restore the target margin
6. If supplier price has increased by more than 15%, flag it as an alert
7. If supplier price has decreased, consider lowering the Shopify price to be more competitive
8. Update product notes with any changes observed
9. Post a summary to Slack when done`,
    context: { products: supplierProducts },
  });
}
