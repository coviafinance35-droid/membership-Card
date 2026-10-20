import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { shipment_id } = await req.json();
    const rows = await db.execute(sql`SELECT id, total_cents, payment_status FROM public.shipment_orders WHERE id = ${shipment_id}`);
    const shipment = rows.rows[0] as { id: string; total_cents: number; payment_status: string } | undefined;
    if (!shipment || shipment.payment_status !== "pending") return NextResponse.json({ ok: false, error: "Shipment is not payable." }, { status: 400 });
    if (process.env.PAYMENT_PROVIDER !== "stripe") return NextResponse.json({ ok: false, error: "Solana payment is required." }, { status: 400 });
    const secret = process.env.STRIPE_SECRET_KEY;
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? req.headers.get("origin") ?? "http://localhost:3000";
    if (!secret) return NextResponse.json({ ok: false, error: "Payment provider is not configured." }, { status: 503 });
    const stripe = new Stripe(secret, { apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion });
    const session = await stripe.checkout.sessions.create({ mode: "payment", success_url: `${origin}/order/success?order=${shipment.id}`, cancel_url: `${origin}/order`, line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: shipment.total_cents, product_data: { name: "Physical membership card delivery" } } }], client_reference_id: shipment.id, metadata: { shipment_id: shipment.id } }, { idempotencyKey: `shipment_checkout_${shipment.id}` });
    await db.execute(sql`UPDATE public.shipment_orders SET stripe_session_id = ${session.id}, updated_at = now() WHERE id = ${shipment.id}`);
    return NextResponse.json({ ok: true, checkout_url: session.url });
  } catch (error) { console.error("[checkout/create]", error); return NextResponse.json({ ok: false, error: "Checkout could not be started." }, { status: 500 }); }
}
