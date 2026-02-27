import { eq } from "drizzle-orm";
import { getDb } from "../client.js";
import { orders } from "../schema.js";

export function getOrder(orderId: string) {
  return getDb().select().from(orders).where(eq(orders.id, orderId)).get();
}

export function upsertOrder(order: typeof orders.$inferInsert) {
  return getDb()
    .insert(orders)
    .values(order)
    .onConflictDoUpdate({
      target: orders.id,
      set: {
        ...order,
        updatedAt: new Date().toISOString(),
      },
    });
}

export function updateOrderStatus(
  orderId: string,
  fields: Partial<typeof orders.$inferInsert>
) {
  return getDb()
    .update(orders)
    .set({ ...fields, updatedAt: new Date().toISOString() })
    .where(eq(orders.id, orderId));
}

export function listRecentOrders(limit = 20) {
  return getDb().select().from(orders).orderBy(orders.createdAt).limit(limit).all();
}
