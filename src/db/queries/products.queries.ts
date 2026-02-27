import { eq } from "drizzle-orm";
import { getDb } from "../client.js";
import { products } from "../schema.js";

export function getProduct(productId: string) {
  return getDb().select().from(products).where(eq(products.id, productId)).get();
}

export function upsertProduct(product: typeof products.$inferInsert) {
  return getDb()
    .insert(products)
    .values(product)
    .onConflictDoUpdate({
      target: products.id,
      set: product,
    });
}

export function listProducts() {
  return getDb().select().from(products).all();
}

export function getProductBySupplier(supplierName: string, supplierProductId: string) {
  return getDb()
    .select()
    .from(products)
    .where(eq(products.supplierProductId, supplierProductId))
    .get();
}
