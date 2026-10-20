import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
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
  const supabase = await createServiceClient();
  const payload = { user_id: userId, card_id: input.card_id, card_snapshot: input.card_snapshot, recipient_name: input.full_name, email: input.email, phone: input.phone ?? null, street: input.street, unit: input.unit ?? null, city: input.city, state: input.state ?? null, postal_code: input.zip, country: input.country.toUpperCase(), shipping_cost_cents: quote.shipping_cost_cents, delivery_method: input.service, delivery_fee_cents: quote.shipping_cost_cents, delivery_window: quote.delivery_window, total_cents: quote.shipping_cost_cents, idempotency_key: idempotencyKey };
  const { data, error } = await supabase.from("shipment_orders").upsert(payload, { onConflict: "idempotency_key" }).select("id, total_cents, shipping_cost_cents, delivery_method, delivery_fee_cents, delivery_window").single();
  if (error) throw error;
  return NextResponse.json({ ok: true, shipment: data, estimated_days: quote.estimated_days, delivery_window: quote.delivery_window });
}
