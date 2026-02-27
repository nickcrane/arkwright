import { upsertOrder } from "../../db/queries/orders.queries.js";
import { getProduct } from "../../db/queries/products.queries.js";
import type { AgentEvent } from "../../agent/types.js";

export async function handleOrderCreated(
  payload: Record<string, unknown>
): Promise<AgentEvent> {
  const order = payload as Record<string, unknown>;
  const orderId = String(order.id);
  const lineItems = (order.line_items as Array<Record<string, unknown>>) || [];

  await upsertOrder({
    id: orderId,
    shopifyOrderNumber: String(order.order_number || ""),
    customerEmail: String((order.customer as Record<string, unknown>)?.email || ""),
    customerId: String((order.customer as Record<string, unknown>)?.id || ""),
    totalPrice: Number(order.total_price) || 0,
    currency: String(order.currency || "USD"),
    financialStatus: String(order.financial_status || "pending"),
    fulfillmentStatus: String(order.fulfillment_status || "unfulfilled"),
    status: "pending",
    rawPayload: JSON.stringify(order),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Enrich with supplier mappings for each line item
  const productMappings = lineItems.map((item) => {
    const productId = String(item.product_id || "");
    const mapping = getProduct(productId);
    return {
      title: item.title,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      productId,
      supplier: mapping
        ? {
            name: mapping.supplierName,
            productId: mapping.supplierProductId,
            variantId: mapping.supplierVariantId,
            cost: mapping.supplierPrice,
          }
        : null,
    };
  });

  const customer = order.customer as Record<string, unknown> | undefined;
  const shippingAddress = order.shipping_address as Record<string, unknown> | undefined;

  return {
    type: "webhook",
    source: "orders/create",
    priority: "high",
    prompt: `A new order has been placed on FirstTees and needs fulfillment.

**Order #${order.order_number}** (ID: ${orderId})
- Total: $${order.total_price} ${order.currency}
- Payment status: ${order.financial_status}
- Customer: ${customer?.first_name} ${customer?.last_name} (${customer?.email})
- Customer order count: ${customer?.orders_count || "first order"}

**Line Items:**
${productMappings
  .map(
    (item) =>
      `- ${item.quantity}x "${item.title}" (SKU: ${item.sku}, $${item.price}/ea)
    Supplier: ${item.supplier ? `${item.supplier.name} (PID: ${item.supplier.productId}, cost: $${item.supplier.cost})` : "NO SUPPLIER MAPPED - needs manual setup"}`
  )
  .join("\n")}

**Shipping Address:**
${shippingAddress ? `${shippingAddress.address1}, ${shippingAddress.city}, ${shippingAddress.province_code} ${shippingAddress.zip}, ${shippingAddress.country_code}` : "Not provided"}

Please:
1. If all items have supplier mappings and payment is confirmed, place the supplier order(s)
2. Record the expense in the ledger
3. Record the revenue in the ledger
4. Save a note about this order
5. Notify the owner on Slack with order details and margin info
6. If any items lack supplier mappings, alert the owner on Slack and request guidance`,
    context: {
      order: payload,
      productMappings,
    },
  };
}
