import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dbPath = process.env.DATABASE_PATH || "./data/arkwright.db";
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    shopify_order_number TEXT,
    customer_email TEXT,
    customer_id TEXT,
    total_price REAL,
    currency TEXT DEFAULT 'USD',
    financial_status TEXT,
    fulfillment_status TEXT,
    supplier_order_id TEXT,
    supplier_name TEXT,
    supplier_cost REAL,
    tracking_number TEXT,
    tracking_url TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    raw_payload TEXT,
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    title TEXT,
    shopify_handle TEXT,
    supplier_name TEXT,
    supplier_product_id TEXT,
    supplier_variant_id TEXT,
    supplier_price REAL,
    shopify_price REAL,
    margin_percent REAL,
    auto_fulfill INTEGER DEFAULT 1,
    last_synced_at TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    related_entity_type TEXT,
    related_entity_id TEXT,
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    category TEXT,
    description TEXT,
    order_id TEXT,
    product_id TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    event_source TEXT,
    agent_model TEXT,
    tool_calls TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_cost_usd REAL,
    duration_ms INTEGER,
    outcome TEXT,
    summary TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS processed_webhooks (
    webhook_id TEXT PRIMARY KEY,
    topic TEXT,
    processed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS pending_approvals (
    id TEXT PRIMARY KEY,
    description TEXT,
    amount REAL,
    order_id TEXT,
    slack_message_ts TEXT,
    status TEXT DEFAULT 'pending',
    responded_by TEXT,
    responded_at TEXT,
    created_at TEXT,
    expires_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sourcing_briefs (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_margin_percent REAL NOT NULL,
    max_supplier_price REAL,
    min_supplier_price REAL,
    tags TEXT,
    supplier_preference TEXT DEFAULT 'aliexpress',
    status TEXT NOT NULL DEFAULT 'active',
    priority INTEGER DEFAULT 1,
    max_products INTEGER DEFAULT 10,
    current_products INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
  CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_entries(type);
  CREATE INDEX IF NOT EXISTS idx_ledger_created ON ledger_entries(created_at);
  CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
`);

console.log("Migration complete. Database ready at:", dbPath);
db.close();
