import crypto from "node:crypto";

export function verifyShopifyWebhook(
  rawBody: Buffer,
  hmacHeader: string,
  secret: string
): boolean {
  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(hmacHeader)
  );
}
