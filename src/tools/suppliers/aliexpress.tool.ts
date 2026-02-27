import { getAliExpressClient } from "../../services/aliexpress.service.js";
import type { ToolDefinition } from "../../agent/types.js";

export const aliexpressTools: ToolDefinition[] = [
  {
    name: "aliexpress_search_products",
    description: "Search the AliExpress catalog for dropshipping products by keyword",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Product search query" },
        pageNum: { type: "number", description: "Page number (default 1)" },
        pageSize: { type: "number", description: "Results per page (default 20, max 50)" },
      },
      required: ["query"],
    },
    execute: async (input) =>
      getAliExpressClient().searchProducts(
        input.query as string,
        (input.pageNum as number) || 1,
        (input.pageSize as number) || 20
      ),
  },
  {
    name: "aliexpress_get_product",
    description: "Get detailed product information from AliExpress including pricing, variants, and images",
    input_schema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "AliExpress product ID" },
        shipToCountry: { type: "string", description: "Ship-to country code (default US)" },
        currency: { type: "string", description: "Target currency (default USD)" },
      },
      required: ["productId"],
    },
    execute: async (input) =>
      getAliExpressClient().getProduct(
        input.productId as string,
        input.shipToCountry as string | undefined,
        input.currency as string | undefined
      ),
  },
  {
    name: "aliexpress_create_order",
    description:
      "Place a dropshipping order on AliExpress. Check spending limits first.",
    input_schema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "AliExpress product ID" },
        skuAttr: {
          type: "string",
          description: "SKU attributes string identifying the variant (e.g. colour/size)",
        },
        quantity: { type: "number", description: "Quantity to order" },
        shippingAddress: {
          type: "object",
          properties: {
            fullName: { type: "string" },
            phone: { type: "string" },
            country: { type: "string" },
            province: { type: "string" },
            city: { type: "string" },
            address: { type: "string" },
            zip: { type: "string" },
          },
          required: ["fullName", "country", "province", "city", "address", "zip"],
        },
        logisticsService: { type: "string", description: "Logistics service name (default CAINIAO_STANDARD)" },
        estimatedCost: { type: "number", description: "Estimated cost in USD for spending limit check" },
      },
      required: ["productId", "skuAttr", "quantity", "shippingAddress"],
    },
    execute: async (input) =>
      getAliExpressClient().createOrder({
        productId: input.productId as string,
        skuAttr: input.skuAttr as string,
        quantity: input.quantity as number,
        shippingAddress: input.shippingAddress as {
          fullName: string;
          phone: string;
          country: string;
          province: string;
          city: string;
          address: string;
          zip: string;
        },
        logisticsService: input.logisticsService as string | undefined,
      }),
  },
  {
    name: "aliexpress_get_order_status",
    description: "Check the status of an AliExpress dropshipping order",
    input_schema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "AliExpress order ID" },
      },
      required: ["orderId"],
    },
    execute: async (input) =>
      getAliExpressClient().getOrderStatus(input.orderId as string),
  },
  {
    name: "aliexpress_get_tracking",
    description: "Get tracking information for an AliExpress order",
    input_schema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "AliExpress order ID" },
      },
      required: ["orderId"],
    },
    execute: async (input) =>
      getAliExpressClient().getTrackingInfo(input.orderId as string),
  },
  {
    name: "aliexpress_get_shipping",
    description: "Calculate shipping costs for an AliExpress product to a destination country",
    input_schema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "AliExpress product ID" },
        countryCode: { type: "string", description: "Destination country code (e.g. US, GB)" },
        quantity: { type: "number", description: "Quantity (default 1)" },
      },
      required: ["productId", "countryCode"],
    },
    execute: async (input) =>
      getAliExpressClient().getShippingInfo(
        input.productId as string,
        input.countryCode as string,
        (input.quantity as number) || 1
      ),
  },
];
