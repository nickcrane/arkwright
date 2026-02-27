import * as slack from "../../services/slack.service.js";
import { requestApproval } from "../../guardrails/approval-gate.js";
import type { ToolDefinition } from "../../agent/types.js";

export const slackTools: ToolDefinition[] = [
  {
    name: "slack_send_message",
    description: "Post a message to a Slack channel. Available channels: log, orders, approvals, alerts",
    input_schema: {
      type: "object",
      properties: {
        channel: {
          type: "string",
          enum: ["log", "orders", "approvals", "alerts"],
          description: "Channel name (without #arkwright- prefix)",
        },
        text: { type: "string", description: "Message text (supports Slack mrkdwn)" },
      },
      required: ["channel", "text"],
    },
    execute: async (input) => {
      const channelMap: Record<string, string | undefined> = {
        log: process.env.SLACK_CHANNEL_LOG,
        orders: process.env.SLACK_CHANNEL_ORDERS,
        approvals: process.env.SLACK_CHANNEL_APPROVALS,
        alerts: process.env.SLACK_CHANNEL_ALERTS,
      };
      const channelId = channelMap[input.channel as string];
      if (!channelId) throw new Error(`Unknown channel: ${input.channel}`);
      return slack.sendMessage(channelId, { text: input.text as string });
    },
  },
  {
    name: "slack_send_dm_owner",
    description: "Send a direct message to the store owner for urgent matters",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Message text" },
      },
      required: ["text"],
    },
    execute: async (input) =>
      slack.sendDM(process.env.SLACK_OWNER_USER_ID!, input.text as string),
  },
  {
    name: "slack_request_approval",
    description: "Send an approval request to the owner with Approve/Deny buttons. Use when an action exceeds spending limits or you are uncertain.",
    input_schema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "What needs approval and why",
        },
        amount: { type: "number", description: "Dollar amount involved (if applicable)" },
        orderId: { type: "string", description: "Related order ID (if applicable)" },
      },
      required: ["description"],
    },
    execute: async (input) =>
      requestApproval({
        description: input.description as string,
        amount: input.amount as number | undefined,
        orderId: input.orderId as string | undefined,
      }),
  },
  {
    name: "slack_read_channel",
    description: "Read recent messages from a Slack channel",
    input_schema: {
      type: "object",
      properties: {
        channel: {
          type: "string",
          enum: ["log", "orders", "approvals", "alerts"],
        },
        limit: { type: "number", description: "Number of messages to read (default 10)" },
      },
      required: ["channel"],
    },
    execute: async (input) => {
      const channelMap: Record<string, string | undefined> = {
        log: process.env.SLACK_CHANNEL_LOG,
        orders: process.env.SLACK_CHANNEL_ORDERS,
        approvals: process.env.SLACK_CHANNEL_APPROVALS,
        alerts: process.env.SLACK_CHANNEL_ALERTS,
      };
      const channelId = channelMap[input.channel as string];
      if (!channelId) throw new Error(`Unknown channel: ${input.channel}`);
      return slack.readChannelHistory(channelId, (input.limit as number) || 10);
    },
  },
];
