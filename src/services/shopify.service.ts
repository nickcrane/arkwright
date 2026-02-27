import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";
import { logger } from "../utils/logger.js";

let client: ReturnType<typeof createClient> | null = null;

function createClient() {
  const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: [
      "read_products",
      "write_products",
      "read_orders",
      "write_orders",
      "read_customers",
      "read_inventory",
      "write_inventory",
      "read_fulfillments",
      "write_fulfillments",
    ],
    hostName: process.env.SHOPIFY_STORE_DOMAIN!,
    apiVersion: LATEST_API_VERSION,
    isCustomStoreApp: true,
    isEmbeddedApp: false,
    adminApiAccessToken: process.env.SHOPIFY_ACCESS_TOKEN!,
  });

  const session = shopify.session.customAppSession(
    process.env.SHOPIFY_STORE_DOMAIN!
  );
  session.accessToken = process.env.SHOPIFY_ACCESS_TOKEN!;

  const gql = new shopify.clients.Graphql({ session });

  return { shopify, session, gql };
}

function getClient() {
  if (!client) client = createClient();
  return client;
}

async function query(queryStr: string, variables?: Record<string, unknown>) {
  const { gql } = getClient();
  const response = await gql.request(queryStr, { variables });
  return response.data;
}

// --- Products ---

export async function getProduct(productId: string) {
  return query(
    `query getProduct($id: ID!) {
      product(id: $id) {
        id title handle descriptionHtml vendor productType status tags
        variants(first: 50) {
          edges { node { id title price sku inventoryQuantity } }
        }
        images(first: 10) {
          edges { node { id url altText } }
        }
      }
    }`,
    { id: `gid://shopify/Product/${productId}` }
  );
}

export async function listProducts(first = 50, queryFilter?: string) {
  return query(
    `query listProducts($first: Int!, $query: String) {
      products(first: $first, query: $query) {
        edges {
          node {
            id title handle vendor productType status
            variants(first: 5) { edges { node { id price sku } } }
          }
        }
      }
    }`,
    { first, query: queryFilter }
  );
}

export async function createProduct(input: Record<string, unknown>) {
  return query(
    `mutation createProduct($input: ProductInput!) {
      productCreate(input: $input) {
        product { id title handle }
        userErrors { field message }
      }
    }`,
    { input }
  );
}

export async function updateProduct(
  productId: string,
  input: Record<string, unknown>
) {
  return query(
    `mutation updateProduct($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id title handle }
        userErrors { field message }
      }
    }`,
    { input: { id: `gid://shopify/Product/${productId}`, ...input } }
  );
}

// --- SEO ---

export async function updateProductSEO(
  productId: string,
  seoTitle: string,
  seoDescription: string
) {
  return query(
    `mutation updateProductSEO($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id title handle
          seo { title description }
        }
        userErrors { field message }
      }
    }`,
    {
      input: {
        id: `gid://shopify/Product/${productId}`,
        seo: { title: seoTitle, description: seoDescription },
      },
    }
  );
}

// --- Orders ---

export async function getOrder(orderId: string) {
  return query(
    `query getOrder($id: ID!) {
      order(id: $id) {
        id name totalPriceSet { shopMoney { amount currencyCode } }
        displayFinancialStatus displayFulfillmentStatus
        lineItems(first: 50) {
          edges { node { title quantity sku variant { id price } product { id } } }
        }
        customer { id email firstName lastName ordersCount }
        shippingAddress {
          address1 address2 city provinceCode zip countryCode
        }
        fulfillmentOrders(first: 10) {
          edges { node { id status } }
        }
      }
    }`,
    { id: `gid://shopify/Order/${orderId}` }
  );
}

export async function listOrders(first = 50, queryFilter?: string) {
  return query(
    `query listOrders($first: Int!, $query: String) {
      orders(first: $first, query: $query) {
        edges {
          node {
            id name totalPriceSet { shopMoney { amount currencyCode } }
            displayFinancialStatus displayFulfillmentStatus createdAt
          }
        }
      }
    }`,
    { first, query: queryFilter }
  );
}

// --- Fulfillment ---

export async function createFulfillment(
  orderId: string,
  trackingInfo: {
    number: string;
    company: string;
    url: string;
  }
) {
  // First get fulfillment order
  const orderData = await query(
    `query getFulfillmentOrders($id: ID!) {
      order(id: $id) {
        fulfillmentOrders(first: 5) {
          edges { node { id status lineItems(first: 50) { edges { node { id remainingQuantity } } } } }
        }
      }
    }`,
    { id: `gid://shopify/Order/${orderId}` }
  );

  const fulfillmentOrders = (orderData as Record<string, unknown>)?.order as Record<string, unknown>;
  const edges = (fulfillmentOrders?.fulfillmentOrders as Record<string, unknown>)?.edges as Array<Record<string, unknown>>;
  const openFO = edges?.find(
    (e) => (e.node as Record<string, unknown>).status === "OPEN"
  );

  if (!openFO) {
    throw new Error(`No open fulfillment order found for order ${orderId}`);
  }

  const foNode = openFO.node as Record<string, unknown>;

  return query(
    `mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
      fulfillmentCreateV2(fulfillment: $fulfillment) {
        fulfillment { id status trackingInfo { number url company } }
        userErrors { field message }
      }
    }`,
    {
      fulfillment: {
        lineItemsByFulfillmentOrder: [
          { fulfillmentOrderId: foNode.id },
        ],
        trackingInfo: {
          number: trackingInfo.number,
          company: trackingInfo.company,
          url: trackingInfo.url,
        },
      },
    }
  );
}

// --- Customers ---

export async function getCustomer(customerId: string) {
  return query(
    `query getCustomer($id: ID!) {
      customer(id: $id) {
        id email firstName lastName ordersCount
        orders(first: 10) {
          edges { node { id name totalPriceSet { shopMoney { amount } } createdAt } }
        }
        tags
      }
    }`,
    { id: `gid://shopify/Customer/${customerId}` }
  );
}

// --- Inventory ---

export async function adjustInventory(
  inventoryItemId: string,
  locationId: string,
  delta: number,
  reason = "correction"
) {
  return query(
    `mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
      inventoryAdjustQuantities(input: $input) {
        inventoryAdjustmentGroup { reason }
        userErrors { field message }
      }
    }`,
    {
      input: {
        reason,
        changes: [
          {
            inventoryItemId: `gid://shopify/InventoryItem/${inventoryItemId}`,
            locationId: `gid://shopify/Location/${locationId}`,
            delta,
          },
        ],
      },
    }
  );
}

// --- Refunds ---

export async function createRefund(
  orderId: string,
  refundLineItems: Array<{ lineItemId: string; quantity: number }>,
  note?: string
) {
  return query(
    `mutation refundCreate($input: RefundInput!) {
      refundCreate(input: $input) {
        refund { id }
        userErrors { field message }
      }
    }`,
    {
      input: {
        orderId: `gid://shopify/Order/${orderId}`,
        refundLineItems: refundLineItems.map((item) => ({
          lineItemId: `gid://shopify/LineItem/${item.lineItemId}`,
          quantity: item.quantity,
        })),
        note,
      },
    }
  );
}

// --- Webhooks ---

export async function registerWebhook(topic: string, callbackUrl: string) {
  return query(
    `mutation webhookCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription { id topic }
        userErrors { field message }
      }
    }`,
    {
      topic,
      webhookSubscription: {
        callbackUrl,
        format: "JSON",
      },
    }
  );
}

export async function listWebhooks() {
  return query(`{
    webhookSubscriptions(first: 50) {
      edges { node { id topic callbackUrl } }
    }
  }`);
}

logger.info("Shopify service initialized");
