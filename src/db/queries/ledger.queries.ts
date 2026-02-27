import { eq, sql, gte, lte, and } from "drizzle-orm";
import { getDb } from "../client.js";
import { ledgerEntries } from "../schema.js";

export function recordEntry(entry: typeof ledgerEntries.$inferInsert) {
  return getDb()
    .insert(ledgerEntries)
    .values({ ...entry, createdAt: new Date().toISOString() })
    .returning()
    .get();
}

export function getBalance() {
  const result = getDb()
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END), 0)`,
      totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)`,
      totalRefunds: sql<number>`COALESCE(SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END), 0)`,
    })
    .from(ledgerEntries)
    .get();

  const revenue = result?.totalRevenue ?? 0;
  const expenses = result?.totalExpenses ?? 0;
  const refunds = result?.totalRefunds ?? 0;

  return {
    totalRevenue: revenue,
    totalExpenses: expenses,
    totalRefunds: refunds,
    netProfit: revenue - expenses - refunds,
  };
}

export function getDailySpend(date: string) {
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

  const result = getDb()
    .select({
      total: sql<number>`COALESCE(SUM(amount), 0)`,
    })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.type, "expense"),
        gte(ledgerEntries.createdAt, startOfDay),
        lte(ledgerEntries.createdAt, endOfDay)
      )
    )
    .get();

  return result?.total ?? 0;
}

export function getReport(startDate: string, endDate: string) {
  return getDb()
    .select()
    .from(ledgerEntries)
    .where(
      and(
        gte(ledgerEntries.createdAt, startDate),
        lte(ledgerEntries.createdAt, endDate)
      )
    )
    .all();
}
