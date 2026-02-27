import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { logger } from "../utils/logger.js";
import path from "node:path";
import fs from "node:fs";

let db: ReturnType<typeof createDb>;

function createDb(dbPath: string) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  logger.info({ path: dbPath }, "Database connected");

  return drizzle(sqlite, { schema });
}

export function getDb(dbPath?: string) {
  if (!db) {
    const resolvedPath = dbPath || process.env.DATABASE_PATH || "./data/arkwright.db";
    db = createDb(resolvedPath);
  }
  return db;
}
