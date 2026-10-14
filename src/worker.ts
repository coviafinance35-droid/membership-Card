import { Worker } from "bullmq";
import IORedis from "ioredis";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getFulfillmentProvider } from "@/lib/fulfillment";

const redisUrl = process.env.REDIS_URL_3 ?? process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL_3 is required for the worker.");
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false });

const worker = new Worker("fulfillment", async (job) => {
  const orderId = String(job.data.orderId);
  const rows = await db.execute(sql`SELECT id, card_id, card_snapshot, recipient_name, email, phone, street, unit, city, state, postal_code, country FROM shipment_orders WHERE id = ${orderId} AND payment_status = 'paid'`);
  const order = rows.rows[0] as Record<string, unknown> | undefined;
  if (!order) return { skipped: true };
  const provider = getFulfillmentProvider();
  const rates = await provider.getShippingRates({ full_name: String(order.recipient_name), street: String(order.street), unit: order.unit as string | null, city: String(order.city), state: String(order.state ?? ""), zip: String(order.postal_code), country: String(order.country), phone: order.phone as string | null });
  const fulfillment = await provider.createOrder({ idempotency_key: `shipment:${orderId}`, product_sku: "member-card-pvc", quantity: 1, shipping: rates[0], address: { full_name: String(order.recipient_name), street: String(order.street), unit: order.unit as string | null, city: String(order.city), state: String(order.state ?? ""), zip: String(order.postal_code), country: String(order.country), phone: order.phone as string | null }, artwork: order.card_snapshot as never });
  await db.execute(sql`UPDATE shipment_orders SET payment_provider = ${provider.id}, updated_at = now() WHERE id = ${orderId}`);
  return fulfillment;
}, { connection });

worker.on("failed", (job, error) => console.error("[fulfillment-worker]", job?.id, error));
