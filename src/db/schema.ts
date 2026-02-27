import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  shopifyOrderNumber: text("shopify_order_number"),
  customerEmail: text("customer_email"),
  customerId: text("customer_id"),
  totalPrice: real("total_price"),
  currency: text("currency").default("USD"),
  financialStatus: text("financial_status"),
  fulfillmentStatus: text("fulfillment_status"),
  supplierOrderId: text("supplier_order_id"),
  supplierName: text("supplier_name"),
  supplierCost: real("supplier_cost"),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  status: text("status").default("pending"),
  notes: text("notes"),
  rawPayload: text("raw_payload"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  title: text("title"),
  shopifyHandle: text("shopify_handle"),
  supplierName: text("supplier_name"),
  supplierProductId: text("supplier_product_id"),
  supplierVariantId: text("supplier_variant_id"),
  supplierPrice: real("supplier_price"),
  shopifyPrice: real("shopify_price"),
  marginPercent: real("margin_percent"),
  autoFulfill: integer("auto_fulfill", { mode: "boolean" }).default(true),
  lastSyncedAt: text("last_synced_at"),
  createdAt: text("created_at"),
});

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: text("related_entity_id"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const ledgerEntries = sqliteTable("ledger_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").default("USD"),
  category: text("category"),
  description: text("description"),
  orderId: text("order_id"),
  productId: text("product_id"),
  createdAt: text("created_at"),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventType: text("event_type").notNull(),
  eventSource: text("event_source"),
  agentModel: text("agent_model"),
  toolCalls: text("tool_calls"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  totalCostUsd: real("total_cost_usd"),
  durationMs: integer("duration_ms"),
  outcome: text("outcome"),
  summary: text("summary"),
  createdAt: text("created_at"),
});

export const processedWebhooks = sqliteTable("processed_webhooks", {
  webhookId: text("webhook_id").primaryKey(),
  topic: text("topic"),
  processedAt: text("processed_at"),
});

export const sourcingBriefs = sqliteTable("sourcing_briefs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  targetMarginPercent: real("target_margin_percent").notNull(),
  maxSupplierPrice: real("max_supplier_price"),
  minSupplierPrice: real("min_supplier_price"),
  tags: text("tags"),
  supplierPreference: text("supplier_preference").default("aliexpress"),
  status: text("status").notNull().default("active"),
  priority: integer("priority").default(1),
  maxProducts: integer("max_products").default(10),
  currentProducts: integer("current_products").default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const pendingApprovals = sqliteTable("pending_approvals", {
  id: text("id").primaryKey(),
  description: text("description"),
  amount: real("amount"),
  orderId: text("order_id"),
  slackMessageTs: text("slack_message_ts"),
  status: text("status").default("pending"),
  respondedBy: text("responded_by"),
  respondedAt: text("responded_at"),
  createdAt: text("created_at"),
  expiresAt: text("expires_at"),
});
