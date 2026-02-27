import { desc, sql, gte, and } from "drizzle-orm";
import { getDb } from "../client.js";
import { auditLog, processedWebhooks, pendingApprovals } from "../schema.js";
import { eq } from "drizzle-orm";

export function logAgentRun(entry: typeof auditLog.$inferInsert) {
  return getDb()
    .insert(auditLog)
    .values({ ...entry, createdAt: new Date().toISOString() })
    .returning()
    .get();
}

export function getRecentAuditLogs(limit = 20) {
  return getDb()
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .all();
}

export function isWebhookProcessed(webhookId: string): boolean {
  const result = getDb()
    .select()
    .from(processedWebhooks)
    .where(eq(processedWebhooks.webhookId, webhookId))
    .get();
  return !!result;
}

export function markWebhookProcessed(webhookId: string, topic: string) {
  return getDb()
    .insert(processedWebhooks)
    .values({
      webhookId,
      topic,
      processedAt: new Date().toISOString(),
    });
}

export function createApproval(approval: typeof pendingApprovals.$inferInsert) {
  return getDb().insert(pendingApprovals).values(approval);
}

export function updateApproval(
  approvalId: string,
  status: "approved" | "denied",
  respondedBy: string
) {
  return getDb()
    .update(pendingApprovals)
    .set({
      status,
      respondedBy,
      respondedAt: new Date().toISOString(),
    })
    .where(eq(pendingApprovals.id, approvalId));
}

export function getInvocationCountLastHour(): number {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const result = getDb()
    .select({ count: sql<number>`COUNT(*)` })
    .from(auditLog)
    .where(gte(auditLog.createdAt, oneHourAgo))
    .get();
  return result?.count ?? 0;
}
