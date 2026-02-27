import cron from "node-cron";
import { logger } from "../utils/logger.js";
import { checkShipments } from "./jobs/check-shipments.js";
import { syncInventory } from "./jobs/sync-inventory.js";
import { dailyReport } from "./jobs/daily-report.js";
import { staleOrders } from "./jobs/stale-orders.js";
import { syncPricing } from "./jobs/sync-pricing.js";
import { sourceProducts } from "./jobs/source-products.js";

export function startScheduler() {
  // Check shipment tracking every 2 hours
  cron.schedule("0 */2 * * *", async () => {
    logger.info("Cron: checking shipments");
    try {
      await checkShipments();
    } catch (err) {
      logger.error({ err }, "Cron: check-shipments failed");
    }
  });

  // Sync inventory with suppliers every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    logger.info("Cron: syncing inventory");
    try {
      await syncInventory();
    } catch (err) {
      logger.error({ err }, "Cron: sync-inventory failed");
    }
  });

  // Sync pricing with AliExpress every 12 hours
  cron.schedule("0 */12 * * *", async () => {
    logger.info("Cron: syncing pricing");
    try {
      await syncPricing();
    } catch (err) {
      logger.error({ err }, "Cron: sync-pricing failed");
    }
  });

  // Source new products from active briefs daily at 10am
  cron.schedule("0 10 * * *", async () => {
    logger.info("Cron: sourcing products");
    try {
      await sourceProducts();
    } catch (err) {
      logger.error({ err }, "Cron: source-products failed");
    }
  });

  // Daily P&L report at 9am
  cron.schedule("0 9 * * *", async () => {
    logger.info("Cron: daily report");
    try {
      await dailyReport();
    } catch (err) {
      logger.error({ err }, "Cron: daily-report failed");
    }
  });

  // Check for stale unfulfilled orders every hour
  cron.schedule("0 * * * *", async () => {
    logger.info("Cron: checking stale orders");
    try {
      await staleOrders();
    } catch (err) {
      logger.error({ err }, "Cron: stale-orders failed");
    }
  });

  logger.info("Scheduler started");
}
