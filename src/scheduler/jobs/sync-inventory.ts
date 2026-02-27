import { runAgent } from "../../agent/agent.js";
import { listProducts } from "../../db/queries/products.queries.js";

export async function syncInventory() {
  const products = listProducts();
  if (products.length === 0) return;

  const productSummaries = products
    .filter((p) => p.supplierProductId)
    .map((p) => `- "${p.title}" (Shopify: ${p.id}, Supplier: ${p.supplierName} ${p.supplierProductId})`)
    .join("\n");

  if (!productSummaries) return;

  await runAgent({
    type: "scheduled",
    source: "cron/sync-inventory",
    priority: "low",
    prompt: `Perform an inventory sync check for these products:

${productSummaries}

For each product:
1. Use aliexpress_get_product to check supplier availability and current pricing
2. If a product is out of stock at the supplier, update the Shopify listing to draft/unavailable
3. If supplier prices have changed significantly (>10%), note it and alert the owner
4. Save any observations as notes`,
    context: { products },
  });
}
