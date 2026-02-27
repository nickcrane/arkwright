import { getDailySpend } from "../db/queries/ledger.queries.js";
import { logger } from "../utils/logger.js";

interface SpendingCheckResult {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
}

interface SpendingLimits {
  maxSingleOrderCost: number;
  maxDailySpend: number;
  maxRefundAmount: number;
  minMarginPercent: number;
  maxDiscountPercent: number;
  maxPriceDropPercent: number;
  maxPriceIncreasePercent: number;
}

let limits: SpendingLimits;

export function initLimits(config: SpendingLimits) {
  limits = config;
}

export function checkSupplierOrder(amount: number): SpendingCheckResult {
  if (amount > limits.maxSingleOrderCost) {
    logger.warn({ amount, max: limits.maxSingleOrderCost }, "Supplier order exceeds limit");
    return {
      allowed: false,
      requiresApproval: true,
      reason: `Supplier order $${amount.toFixed(2)} exceeds single-order limit of $${limits.maxSingleOrderCost}`,
    };
  }

  const today = new Date().toISOString().split("T")[0];
  const dailySpent = getDailySpend(today);
  if (dailySpent + amount > limits.maxDailySpend) {
    logger.warn({ dailySpent, amount, max: limits.maxDailySpend }, "Daily spend limit reached");
    return {
      allowed: false,
      requiresApproval: true,
      reason: `Daily spend would reach $${(dailySpent + amount).toFixed(2)}, exceeding limit of $${limits.maxDailySpend}`,
    };
  }

  return { allowed: true, requiresApproval: false };
}

export function checkRefund(amount: number): SpendingCheckResult {
  if (amount > limits.maxRefundAmount) {
    return {
      allowed: false,
      requiresApproval: true,
      reason: `Refund $${amount.toFixed(2)} exceeds auto-refund limit of $${limits.maxRefundAmount}`,
    };
  }
  return { allowed: true, requiresApproval: false };
}

export function checkMargin(revenue: number, cost: number): SpendingCheckResult {
  if (revenue === 0) {
    return {
      allowed: false,
      requiresApproval: true,
      reason: "Revenue is $0 - cannot sell for free",
    };
  }

  const margin = ((revenue - cost) / revenue) * 100;
  if (margin < limits.minMarginPercent) {
    return {
      allowed: false,
      requiresApproval: true,
      reason: `Margin ${margin.toFixed(1)}% is below minimum ${limits.minMarginPercent}%`,
    };
  }

  return { allowed: true, requiresApproval: false };
}

export function checkDiscount(discountPercent: number): SpendingCheckResult {
  if (discountPercent > limits.maxDiscountPercent) {
    return {
      allowed: false,
      requiresApproval: true,
      reason: `Discount ${discountPercent}% exceeds max ${limits.maxDiscountPercent}%`,
    };
  }
  return { allowed: true, requiresApproval: false };
}

export function checkPriceChange(
  currentPrice: number,
  newPrice: number
): SpendingCheckResult {
  if (currentPrice <= 0) {
    return { allowed: true, requiresApproval: false };
  }

  const changePercent = ((newPrice - currentPrice) / currentPrice) * 100;

  if (changePercent < 0 && Math.abs(changePercent) > limits.maxPriceDropPercent) {
    logger.warn(
      { currentPrice, newPrice, changePercent: changePercent.toFixed(1) },
      "Price drop exceeds limit"
    );
    return {
      allowed: false,
      requiresApproval: true,
      reason: `Price drop of ${Math.abs(changePercent).toFixed(1)}% ($${currentPrice.toFixed(2)} → $${newPrice.toFixed(2)}) exceeds max ${limits.maxPriceDropPercent}%`,
    };
  }

  if (changePercent > 0 && changePercent > limits.maxPriceIncreasePercent) {
    logger.warn(
      { currentPrice, newPrice, changePercent: changePercent.toFixed(1) },
      "Price increase exceeds limit"
    );
    return {
      allowed: false,
      requiresApproval: true,
      reason: `Price increase of ${changePercent.toFixed(1)}% ($${currentPrice.toFixed(2)} → $${newPrice.toFixed(2)}) exceeds max ${limits.maxPriceIncreasePercent}%`,
    };
  }

  return { allowed: true, requiresApproval: false };
}
