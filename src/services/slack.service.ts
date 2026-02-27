import { App } from "@slack/bolt";
import { logger } from "../utils/logger.js";
import { updateApproval } from "../db/queries/audit.queries.js";
import { runAgent } from "../agent/agent.js";

let slackApp: App | null = null;

export function initSlack() {
  slackApp = new App({
    token: process.env.SLACK_BOT_TOKEN!,
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN!,
  });

  // Handle approval button clicks
  slackApp.action("approve_action", async ({ ack, body, action }) => {
    await ack();
    const value = JSON.parse((action as { value: string }).value || "{}");
    const userId = body.user.id;

    logger.info({ approvalId: value.approvalId, userId }, "Approval granted");
    await updateApproval(value.approvalId, "approved", userId);

    await sendMessage(process.env.SLACK_CHANNEL_APPROVALS!, {
      text: `Approved by <@${userId}>: ${value.description}`,
    });

    // Re-trigger agent with approval context
    await runAgent({
      type: "manual",
      source: "approval_granted",
      priority: "high",
      prompt: `Approval granted for: ${value.description}. Approval ID: ${value.approvalId}. Order ID: ${value.orderId || "N/A"}. Amount: $${value.amount || "N/A"}. Please proceed with the approved action.`,
      context: { approval: value },
    });
  });

  slackApp.action("deny_action", async ({ ack, body, action }) => {
    await ack();
    const value = JSON.parse((action as { value: string }).value || "{}");
    const userId = body.user.id;

    logger.info({ approvalId: value.approvalId, userId }, "Approval denied");
    await updateApproval(value.approvalId, "denied", userId);

    await sendMessage(process.env.SLACK_CHANNEL_APPROVALS!, {
      text: `Denied by <@${userId}>: ${value.description}`,
    });
  });

  // Listen for DMs to Arkwright
  slackApp.message(async ({ message, say }) => {
    // Only respond to actual user messages (not bot messages or edits)
    if (message.subtype || !("text" in message) || !message.text) return;
    // Ignore messages from bots (including Arkwright itself)
    if ("bot_id" in message) return;

    const userText = message.text;
    const userId = (message as { user: string }).user;

    logger.info({ userId, text: userText }, "Slack message received");

    try {
      const result = await runAgent({
        type: "manual",
        source: "slack/dm",
        priority: "normal",
        prompt: userText,
        context: { slackUserId: userId },
      });

      await say(result.summary || "Done - check the logs for details.");
    } catch (err) {
      logger.error({ err }, "Failed to process Slack message");
      await say("Sorry, I hit an error processing that. Check the logs.");
    }
  });

  // Listen for @Arkwright mentions in channels
  slackApp.event("app_mention", async ({ event, say }) => {
    const userText = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();
    const userId = event.user;

    if (!userText) {
      await say("Hey! What can I help with? Try asking me to source products, check orders, or run a report.");
      return;
    }

    logger.info({ userId, text: userText }, "Slack mention received");

    try {
      const result = await runAgent({
        type: "manual",
        source: "slack/mention",
        priority: "normal",
        prompt: userText,
        context: { slackUserId: userId, channel: event.channel },
      });

      await say(result.summary || "Done - check the logs for details.");
    } catch (err) {
      logger.error({ err }, "Failed to process Slack mention");
      await say("Sorry, I hit an error processing that. Check the logs.");
    }
  });

  return slackApp;
}

export async function startSlack() {
  if (!slackApp) initSlack();
  await slackApp!.start();
  logger.info("Slack app started in Socket Mode");
}

export async function sendMessage(
  channel: string,
  opts: { text: string; blocks?: unknown[] }
) {
  if (!slackApp) throw new Error("Slack not initialized");
  return slackApp.client.chat.postMessage({
    channel,
    text: opts.text,
    blocks: opts.blocks as never,
  });
}

export async function sendDM(userId: string, text: string) {
  if (!slackApp) throw new Error("Slack not initialized");
  const conversation = await slackApp.client.conversations.open({
    users: userId,
  });
  if (conversation.channel?.id) {
    return slackApp.client.chat.postMessage({
      channel: conversation.channel.id,
      text,
    });
  }
}

export async function sendApprovalRequest(opts: {
  approvalId: string;
  description: string;
  amount?: number;
  orderId?: string;
}) {
  const value = JSON.stringify(opts);

  return sendMessage(process.env.SLACK_CHANNEL_APPROVALS!, {
    text: `Approval needed: ${opts.description}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Approval Required*\n${opts.description}${opts.amount ? `\nAmount: $${opts.amount.toFixed(2)}` : ""}${opts.orderId ? `\nOrder: ${opts.orderId}` : ""}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Approve" },
            style: "primary",
            action_id: "approve_action",
            value,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Deny" },
            style: "danger",
            action_id: "deny_action",
            value,
          },
        ],
      },
    ],
  });
}

export async function readChannelHistory(channel: string, limit = 10) {
  if (!slackApp) throw new Error("Slack not initialized");
  const result = await slackApp.client.conversations.history({
    channel,
    limit,
  });
  return result.messages || [];
}
