import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
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
  const result = await db.execute(sql`INSERT INTO public.shipment_orders (user_id, card_id, card_snapshot, recipient_name, email, phone, street, unit, city, state, postal_code, country, shipping_cost_cents, delivery_method, delivery_fee_cents, delivery_window, total_cents, idempotency_key) VALUES (${userId}, ${input.card_id}, ${JSON.stringify(input.card_snapshot)}::jsonb, ${input.full_name}, ${input.email}, ${input.phone ?? null}, ${input.street}, ${input.unit ?? null}, ${input.city}, ${input.state ?? null}, ${input.zip}, ${input.country.toUpperCase()}, ${quote.shipping_cost_cents}, ${input.service}, ${quote.shipping_cost_cents}, ${quote.delivery_window}, ${quote.shipping_cost_cents}, ${idempotencyKey}) ON CONFLICT (idempotency_key) DO UPDATE SET delivery_method = EXCLUDED.delivery_method, delivery_fee_cents = EXCLUDED.delivery_fee_cents, delivery_window = EXCLUDED.delivery_window, shipping_cost_cents = EXCLUDED.shipping_cost_cents, total_cents = EXCLUDED.total_cents, updated_at = now() RETURNING id, total_cents, shipping_cost_cents, delivery_method, delivery_fee_cents, delivery_window`);
  return NextResponse.json({ ok: true, shipment: result.rows[0], estimated_days: quote.estimated_days, delivery_window: quote.delivery_window });
}
