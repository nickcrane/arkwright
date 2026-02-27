import crypto from "node:crypto";
import { createApproval } from "../db/queries/audit.queries.js";
import { sendApprovalRequest } from "../services/slack.service.js";
import { logger } from "../utils/logger.js";

export async function requestApproval(opts: {
  description: string;
  amount?: number;
  orderId?: string;
  timeoutMinutes?: number;
}): Promise<string> {
  const approvalId = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + (opts.timeoutMinutes || 60) * 60 * 1000
  ).toISOString();

  await createApproval({
    id: approvalId,
    description: opts.description,
    amount: opts.amount,
    orderId: opts.orderId,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt,
  });

  await sendApprovalRequest({
    approvalId,
    description: opts.description,
    amount: opts.amount,
    orderId: opts.orderId,
  });

  logger.info({ approvalId, description: opts.description }, "Approval requested");

  return approvalId;
}
