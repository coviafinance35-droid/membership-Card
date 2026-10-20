import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { shipment_id } = await req.json();
    const supabase = await createServiceClient();
    const { data: shipment } = await supabase.from("shipment_orders").select("id, total_cents, payment_status").eq("id", shipment_id).maybeSingle();
    if (!shipment || shipment.payment_status !== "pending") return NextResponse.json({ ok: false, error: "Shipment is not payable." }, { status: 400 });
    if (process.env.PAYMENT_PROVIDER !== "stripe") return NextResponse.json({ ok: false, error: "Solana payment is required." }, { status: 400 });
    const secret = process.env.STRIPE_SECRET_KEY;
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? req.headers.get("origin") ?? "http://localhost:3000";
    if (!secret) return NextResponse.json({ ok: false, error: "Payment provider is not configured." }, { status: 503 });
    const stripe = new Stripe(secret, { apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion });
    const session = await stripe.checkout.sessions.create({ mode: "payment", success_url: `${origin}/order/success?order=${shipment.id}`, cancel_url: `${origin}/order`, line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: shipment.total_cents, product_data: { name: "Physical membership card delivery" } } }], client_reference_id: shipment.id, metadata: { shipment_id: shipment.id } }, { idempotencyKey: `shipment_checkout_${shipment.id}` });
    const { error: updateError } = await supabase.from("shipment_orders").update({ stripe_session_id: session.id }).eq("id", shipment.id);
    if (updateError) throw updateError;
    return NextResponse.json({ ok: true, checkout_url: session.url });
  } catch (error) { console.error("[checkout/create]", error); return NextResponse.json({ ok: false, error: "Checkout could not be started." }, { status: 500 }); }
}
