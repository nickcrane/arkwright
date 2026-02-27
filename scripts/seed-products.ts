import { getDb } from "../src/db/client.js";
import { products } from "../src/db/schema.js";

// Seed example product mappings (Shopify product ID -> AliExpress supplier mapping)
// Update these with your actual Shopify product IDs and AliExpress product IDs

const sampleProducts = [
  {
    id: "SHOPIFY_PRODUCT_ID_1",
    title: "Classic Logo Tee",
    shopifyHandle: "classic-logo-tee",
    supplierName: "aliexpress",
    supplierProductId: "ALIEXPRESS_PRODUCT_ID_1",
    supplierVariantId: "ALIEXPRESS_SKU_ATTR_1",
    supplierPrice: 8.50,
    shopifyPrice: 24.99,
    marginPercent: 66,
    autoFulfill: true,
    createdAt: new Date().toISOString(),
  },
];

async function main() {
  const db = getDb(process.env.DATABASE_PATH);

  console.log("Seeding product mappings...");

  for (const product of sampleProducts) {
    await db.insert(products).values(product).onConflictDoUpdate({
      target: products.id,
      set: product,
    });
    console.log(`  Seeded: ${product.title}`);
  }

  console.log("\nDone. Update the IDs in this script with your actual Shopify and AliExpress product IDs.");
}

main().catch(console.error);
