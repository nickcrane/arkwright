import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "../client.js";
import { sourcingBriefs } from "../schema.js";

export function createBrief(brief: typeof sourcingBriefs.$inferInsert) {
  return getDb()
    .insert(sourcingBriefs)
    .values({
      ...brief,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning()
    .get();
}

export function updateBrief(
  id: string,
  fields: Partial<Omit<typeof sourcingBriefs.$inferInsert, "id" | "createdAt">>
) {
  return getDb()
    .update(sourcingBriefs)
    .set({ ...fields, updatedAt: new Date().toISOString() })
    .where(eq(sourcingBriefs.id, id));
}

export function getBrief(id: string) {
  return getDb()
    .select()
    .from(sourcingBriefs)
    .where(eq(sourcingBriefs.id, id))
    .get();
}

export function listActiveBriefs() {
  return getDb()
    .select()
    .from(sourcingBriefs)
    .where(eq(sourcingBriefs.status, "active"))
    .orderBy(desc(sourcingBriefs.priority))
    .all();
}

export function incrementProductCount(id: string) {
  return getDb()
    .update(sourcingBriefs)
    .set({
      currentProducts: sql`${sourcingBriefs.currentProducts} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(sourcingBriefs.id, id));
}
