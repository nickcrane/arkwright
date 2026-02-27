import crypto from "node:crypto";
import axios, { type AxiosInstance } from "axios";
import { logger } from "../utils/logger.js";
import { withRetry } from "../utils/retry.js";

const GATEWAY_URL = "https://api-sg.aliexpress.com/sync";

class AliExpressClient {
  private client: AxiosInstance;
  private appKey: string;
  private appSecret: string;
  private accessToken: string;
  private shipToCountry: string;
  private targetCurrency: string;

  constructor(opts: {
    appKey: string;
    appSecret: string;
    accessToken: string;
    shipToCountry: string;
    targetCurrency: string;
  }) {
    this.appKey = opts.appKey;
    this.appSecret = opts.appSecret;
    this.accessToken = opts.accessToken;
    this.shipToCountry = opts.shipToCountry;
    this.targetCurrency = opts.targetCurrency;

    this.client = axios.create({
      baseURL: GATEWAY_URL,
      timeout: 30000,
    });

    this.client.interceptors.response.use(
      (res) => res,
      (err) => {
        logger.error(
          { url: err.config?.url, status: err.response?.status },
          "AliExpress API error"
        );
        throw err;
      }
    );
  }

  /**
   * Generate MD5 HMAC signature for the AliExpress Open Platform.
   * Params are sorted alphabetically, concatenated as key+value pairs,
   * wrapped with the app secret, then MD5-hashed to uppercase hex.
   */
  private sign(params: Record<string, string>): string {
    const sorted = Object.keys(params).sort();
    const baseString =
      this.appSecret +
      sorted.map((k) => `${k}${params[k]}`).join("") +
      this.appSecret;
    return crypto.createHash("md5").update(baseString).digest("hex").toUpperCase();
  }

  private async call(method: string, apiParams: Record<string, string> = {}): Promise<unknown> {
    const timestamp = Date.now().toString();

    const systemParams: Record<string, string> = {
      app_key: this.appKey,
      access_token: this.accessToken,
      timestamp,
      sign_method: "md5",
      method,
      format: "json",
      v: "2.0",
      simplify: "true",
      ...apiParams,
    };

    systemParams.sign = this.sign(systemParams);

    const { data } = await this.client.post("", null, { params: systemParams });

    // AliExpress wraps responses in a method-specific key
    const responseKey = `${method.replaceAll(".", "_")}_response`;
    const body = data[responseKey] ?? data;

    if (body?.rsp_code && body.rsp_code !== "200" && body.rsp_code !== "0") {
      const msg = body.rsp_msg || body.sub_msg || JSON.stringify(body);
      throw new Error(`AliExpress API error (${body.rsp_code}): ${msg}`);
    }

    return body?.result ?? body;
  }

  // --- Products ---

  async searchProducts(
    query: string,
    pageNum = 1,
    pageSize = 20
  ): Promise<unknown> {
    return withRetry(
      async () =>
        this.call("aliexpress.affiliate.product.query", {
          keywords: query,
          page_no: String(pageNum),
          page_size: String(Math.min(pageSize, 50)),
          target_currency: this.targetCurrency,
          target_language: "EN",
          ship_to_country: this.shipToCountry,
          sort: "SALE_PRICE_ASC",
        }),
      { label: "aliexpress_search_products" }
    );
  }

  async getProduct(
    productId: string,
    shipToCountry?: string,
    currency?: string
  ): Promise<unknown> {
    return withRetry(
      async () =>
        this.call("aliexpress.ds.product.get", {
          product_id: productId,
          ship_to_country: shipToCountry || this.shipToCountry,
          target_currency: currency || this.targetCurrency,
          target_language: "EN",
        }),
      { label: "aliexpress_get_product" }
    );
  }

  // --- Orders ---

  async createOrder(params: {
    productId: string;
    skuAttr: string;
    quantity: number;
    shippingAddress: {
      fullName: string;
      phone: string;
      country: string;
      province: string;
      city: string;
      address: string;
      zip: string;
    };
    logisticsService?: string;
  }): Promise<unknown> {
    return withRetry(
      async () =>
        this.call("aliexpress.ds.order.create", {
          logistics_address: JSON.stringify({
            contact_person: params.shippingAddress.fullName,
            phone_country: params.shippingAddress.country,
            mobile_no: params.shippingAddress.phone,
            country: params.shippingAddress.country,
            province: params.shippingAddress.province,
            city: params.shippingAddress.city,
            address: params.shippingAddress.address,
            zip: params.shippingAddress.zip,
          }),
          product_items: JSON.stringify([
            {
              product_id: params.productId,
              sku_attr: params.skuAttr,
              logistics_service_name: params.logisticsService || "CAINIAO_STANDARD",
              order_memo: `FT-${Date.now()}`,
              product_count: params.quantity,
            },
          ]),
        }),
      { label: "aliexpress_create_order" }
    );
  }

  async getOrderStatus(orderId: string): Promise<unknown> {
    return withRetry(
      async () =>
        this.call("aliexpress.ds.order.get", {
          order_id: orderId,
        }),
      { label: "aliexpress_get_order_status" }
    );
  }

  // --- Tracking ---

  async getTrackingInfo(orderId: string): Promise<unknown> {
    return withRetry(
      async () =>
        this.call("aliexpress.logistics.ds.trackinginfo.query", {
          order_id: orderId,
        }),
      { label: "aliexpress_get_tracking" }
    );
  }

  // --- Shipping ---

  async getShippingInfo(
    productId: string,
    countryCode: string,
    quantity = 1
  ): Promise<unknown> {
    return withRetry(
      async () =>
        this.call("aliexpress.logistics.buyer.freight.calculate", {
          product_id: productId,
          country_code: countryCode,
          product_num: String(quantity),
        }),
      { label: "aliexpress_get_shipping" }
    );
  }
}

// --- OAuth token exchange ---

export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
}> {
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const appSecret = process.env.ALIEXPRESS_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error("ALIEXPRESS_APP_KEY and ALIEXPRESS_APP_SECRET must be set");
  }

  const { data } = await axios.post("https://api-sg.aliexpress.com/auth/token/create", null, {
    params: {
      app_key: appKey,
      app_secret: appSecret,
      code,
      grant_type: "authorization_code",
    },
    timeout: 15000,
  });

  if (data.error_response) {
    throw new Error(`Token exchange failed: ${data.error_response.msg || JSON.stringify(data.error_response)}`);
  }

  logger.info({ userId: data.user_id, expiresIn: data.expire_time }, "AliExpress token obtained");

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expire_time,
    userId: data.user_id,
  };
}

export function getAuthUrl(redirectUri: string): string {
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  if (!appKey) throw new Error("ALIEXPRESS_APP_KEY must be set");

  return `https://api-sg.aliexpress.com/oauth/authorize?response_type=code&force_auth=true&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${appKey}`;
}

let aliClient: AliExpressClient | null = null;

export function getAliExpressClient(): AliExpressClient {
  if (!aliClient) {
    const appKey = process.env.ALIEXPRESS_APP_KEY;
    const appSecret = process.env.ALIEXPRESS_APP_SECRET;
    const accessToken = process.env.ALIEXPRESS_ACCESS_TOKEN;

    if (!appKey || !appSecret || !accessToken) {
      throw new Error("AliExpress credentials not configured (ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET, ALIEXPRESS_ACCESS_TOKEN)");
    }

    aliClient = new AliExpressClient({
      appKey,
      appSecret,
      accessToken,
      shipToCountry: process.env.ALIEXPRESS_SHIP_TO_COUNTRY || "US",
      targetCurrency: process.env.ALIEXPRESS_TARGET_CURRENCY || "USD",
    });
  }
  return aliClient;
}
