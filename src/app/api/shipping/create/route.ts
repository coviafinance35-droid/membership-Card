import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shipmentOrders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { shippingSchema, SHIPPING_SERVICES } from "@/lib/shipping";
import crypto from "node:crypto";

export async function POST(req: Request) {
  const parsed = shippingSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Check your delivery details." }, { status: 400 });
  const input = parsed.data;
  const service = SHIPPING_SERVICES[input.service];
  const quote = { shipping_cost_cents: service.amount_cents, estimated_days: service.estimated_days, delivery_window: service.window };
  const userId = req.headers.get("x-member-id")?.trim() || crypto.createHash("sha256").update(input.email.toLowerCase()).digest("hex");
  const idempotencyKey = crypto.createHash("sha256").update(`${userId}:${input.card_id}:${input.email}:${input.street}:${input.zip}`).digest("hex");
  const [shipment] = await db.insert(shipmentOrders).values({
    userId,
    cardId: input.card_id,
    cardSnapshot: input.card_snapshot,
    recipientName: input.full_name,
    email: input.email,
    phone: input.phone ?? null,
    street: input.street,
    unit: input.unit ?? null,
    city: input.city,
    state: input.state ?? null,
    postalCode: input.zip,
    country: input.country.toUpperCase(),
    shippingCostCents: quote.shipping_cost_cents,
    totalCents: quote.shipping_cost_cents,
    idempotencyKey,
  }).onConflictDoUpdate({
    target: shipmentOrders.idempotencyKey,
    set: { updatedAt: new Date() },
  }).returning({ id: shipmentOrders.id, total_cents: shipmentOrders.totalCents, shipping_cost_cents: shipmentOrders.shippingCostCents });
  return NextResponse.json({ ok: true, shipment, estimated_days: quote.estimated_days, delivery_window: quote.delivery_window });
}
