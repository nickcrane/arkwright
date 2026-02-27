import * as shopify from "../../services/shopify.service.js";
import type { ToolDefinition } from "../../agent/types.js";

export const productTools: ToolDefinition[] = [
  {
    name: "shopify_get_product",
    description: "Fetch a product from Shopify by its ID, including variants, images, and pricing",
    input_schema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "The Shopify product ID" },
      },
      required: ["productId"],
    },
    execute: async (input) => shopify.getProduct(input.productId as string),
  },
  {
    name: "shopify_list_products",
    description: "List products from the Shopify store with optional filters",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max products to return (default 50)" },
        query: { type: "string", description: "Search query to filter products" },
      },
    },
    execute: async (input) =>
      shopify.listProducts(
        (input.limit as number) || 50,
        input.query as string | undefined
      ),
  },
  {
    name: "shopify_create_product",
    description: "Create a new product listing on the Shopify store. Requires approval for new products.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Product title" },
        descriptionHtml: { type: "string", description: "Product description in HTML" },
        vendor: { type: "string", description: "Product vendor" },
        productType: { type: "string", description: "Product type/category" },
        tags: { type: "array", items: { type: "string" }, description: "Product tags" },
        variants: {
          type: "array",
          items: {
            type: "object",
            properties: {
              price: { type: "string" },
              sku: { type: "string" },
              title: { type: "string" },
            },
          },
          description: "Product variants with pricing",
        },
      },
      required: ["title"],
    },
    execute: async (input) => shopify.createProduct(input),
  },
  {
    name: "shopify_update_product",
    description: "Update an existing product's details, price, or description",
    input_schema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "The Shopify product ID to update" },
        title: { type: "string" },
        descriptionHtml: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        status: { type: "string", enum: ["ACTIVE", "DRAFT", "ARCHIVED"] },
      },
      required: ["productId"],
    },
    execute: async (input) => {
      const { productId, ...fields } = input;
      return shopify.updateProduct(productId as string, fields);
    },
  },
  {
    name: "shopify_update_product_seo",
    description:
      "Update a product's SEO metadata (meta title and meta description) for search engine optimisation",
    input_schema: {
      type: "object",
      properties: {
        productId: {
          type: "string",
          description: "The Shopify product ID",
        },
        seoTitle: {
          type: "string",
          description: "SEO meta title (max ~70 characters for best results)",
        },
        seoDescription: {
          type: "string",
          description: "SEO meta description (max ~160 characters for best results)",
        },
      },
      required: ["productId", "seoTitle", "seoDescription"],
    },
    execute: async (input) =>
      shopify.updateProductSEO(
        input.productId as string,
        input.seoTitle as string,
        input.seoDescription as string
      ),
  },
];
