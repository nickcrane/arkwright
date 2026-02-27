import { runAgent } from "../../agent/agent.js";
import { listActiveBriefs } from "../../db/queries/sourcing.queries.js";

export async function sourceProducts() {
  const briefs = listActiveBriefs();
  const openBriefs = briefs.filter(
    (b) => (b.currentProducts ?? 0) < (b.maxProducts ?? 10)
  );

  if (openBriefs.length === 0) return;

  const briefSummaries = openBriefs
    .map(
      (b) =>
        `- "${b.title}" (ID: ${b.id}): ${b.description}\n` +
        `  Constraints: margin ≥${b.targetMarginPercent}%` +
        (b.maxSupplierPrice ? `, max cost $${b.maxSupplierPrice}` : "") +
        (b.minSupplierPrice ? `, min cost $${b.minSupplierPrice}` : "") +
        `\n  Progress: ${b.currentProducts ?? 0}/${b.maxProducts ?? 10} products` +
        (b.tags ? ` | Tags: ${b.tags}` : "")
    )
    .join("\n\n");

  await runAgent({
    type: "scheduled",
    source: "cron/source-products",
    priority: "low",
    prompt: `You have active sourcing briefs to fulfill. Search for products on AliExpress that match these briefs:

${briefSummaries}

For each brief:
1. Use aliexpress_search_products with keywords derived from the brief description
2. Review the top results — check pricing, quality indicators (ratings, order count), and images
3. For each promising product, call aliexpress_get_product for full details
4. Verify the product meets the brief's constraints (margin target, price range)
5. For products that qualify, create a DRAFT Shopify listing using shopify_create_product (set status: "DRAFT")
6. Optimise the SEO using shopify_update_product_seo
7. Use sourcing_update_brief to update currentProducts count
8. Record your reasoning in notes (category: "sourcing") for each product you select or reject
9. Post a summary to Slack: what you found, what you listed, what didn't make the cut and why

Important:
- Quality over quantity — only list products that genuinely match the brief
- Always create listings as DRAFT — the owner will review and activate them
- If a brief's description is ambiguous, note what you interpreted and why`,
    context: { briefs: openBriefs },
  });
}
