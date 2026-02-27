import { z } from "zod";

const configSchema = z.object({
  // Anthropic
  anthropicApiKey: z.string().min(1),
  claudeModel: z.string().default("claude-sonnet-4-20250514"),

  // Shopify
  shopifyApiKey: z.string().min(1),
  shopifyApiSecret: z.string().min(1),
  shopifyStoreDomain: z.string().min(1),
  shopifyAccessToken: z.string().min(1),
  shopifyWebhookSecret: z.string().min(1),

  // AliExpress (primary supplier)
  aliexpressAppKey: z.string().min(1),
  aliexpressAppSecret: z.string().min(1),
  aliexpressAccessToken: z.string().min(1),
  aliexpressShipToCountry: z.string().default("US"),
  aliexpressTargetCurrency: z.string().default("USD"),

  // Slack
  slackBotToken: z.string().min(1),
  slackSigningSecret: z.string().min(1),
  slackAppToken: z.string().min(1),
  slackOwnerUserId: z.string().min(1),
  slackChannelLog: z.string().min(1),
  slackChannelOrders: z.string().min(1),
  slackChannelApprovals: z.string().min(1),
  slackChannelAlerts: z.string().min(1),

  // Web Search
  braveSearchApiKey: z.string().default(""),

  // Server
  port: z.coerce.number().default(3000),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  databasePath: z.string().default("./data/arkwright.db"),

  // Guardrails
  maxSingleOrderCost: z.coerce.number().default(100),
  maxDailySpend: z.coerce.number().default(500),
  maxRefundAmount: z.coerce.number().default(30),
  minMarginPercent: z.coerce.number().default(30),
  maxDiscountPercent: z.coerce.number().default(10),
  maxPriceDropPercent: z.coerce.number().default(20),
  maxPriceIncreasePercent: z.coerce.number().default(50),
  maxToolCallsPerInvocation: z.coerce.number().default(20),
  maxInvocationsPerHour: z.coerce.number().default(10),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    claudeModel: process.env.CLAUDE_MODEL,

    shopifyApiKey: process.env.SHOPIFY_API_KEY,
    shopifyApiSecret: process.env.SHOPIFY_API_SECRET,
    shopifyStoreDomain: process.env.SHOPIFY_STORE_DOMAIN,
    shopifyAccessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    shopifyWebhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET,

    aliexpressAppKey: process.env.ALIEXPRESS_APP_KEY,
    aliexpressAppSecret: process.env.ALIEXPRESS_APP_SECRET,
    aliexpressAccessToken: process.env.ALIEXPRESS_ACCESS_TOKEN,
    aliexpressShipToCountry: process.env.ALIEXPRESS_SHIP_TO_COUNTRY,
    aliexpressTargetCurrency: process.env.ALIEXPRESS_TARGET_CURRENCY,

    slackBotToken: process.env.SLACK_BOT_TOKEN,
    slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
    slackAppToken: process.env.SLACK_APP_TOKEN,
    slackOwnerUserId: process.env.SLACK_OWNER_USER_ID,
    slackChannelLog: process.env.SLACK_CHANNEL_LOG,
    slackChannelOrders: process.env.SLACK_CHANNEL_ORDERS,
    slackChannelApprovals: process.env.SLACK_CHANNEL_APPROVALS,
    slackChannelAlerts: process.env.SLACK_CHANNEL_ALERTS,

    braveSearchApiKey: process.env.BRAVE_SEARCH_API_KEY,

    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    databasePath: process.env.DATABASE_PATH,

    maxSingleOrderCost: process.env.MAX_SINGLE_ORDER_COST,
    maxDailySpend: process.env.MAX_DAILY_SPEND,
    maxRefundAmount: process.env.MAX_REFUND_AMOUNT,
    minMarginPercent: process.env.MIN_MARGIN_PERCENT,
    maxDiscountPercent: process.env.MAX_DISCOUNT_PERCENT,
    maxPriceDropPercent: process.env.MAX_PRICE_DROP_PERCENT,
    maxPriceIncreasePercent: process.env.MAX_PRICE_INCREASE_PERCENT,
    maxToolCallsPerInvocation: process.env.MAX_TOOL_CALLS_PER_INVOCATION,
    maxInvocationsPerHour: process.env.MAX_INVOCATIONS_PER_HOUR,
  });

  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`\nConfiguration errors:\n${missing}\n`);
    console.error("Copy .env.example to .env and fill in the required values.");
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
