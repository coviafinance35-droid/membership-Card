import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { createSolanaPayUrl } from "@/lib/solana";
import { PublicKey } from "@solana/web3.js";
import crypto from "node:crypto";

export async function POST(req: Request) {
  try {
    const { shipment_id } = await req.json();
    const rows = await db.execute(sql`SELECT id, total_cents, payment_status FROM public.shipment_orders WHERE id = ${shipment_id}`);
    const shipment = rows.rows[0] as { id: string; total_cents: number; payment_status: string } | undefined;
    if (!shipment || shipment.payment_status !== "pending") return NextResponse.json({ ok: false, error: "Shipment is not payable." }, { status: 400 });
    const reference = new PublicKey(crypto.randomBytes(32)).toBase58();
    const url = createSolanaPayUrl({ amountSol: Number(shipment.total_cents) / 100, reference });
    await db.execute(sql`UPDATE public.shipment_orders SET payment_provider = 'solana', payment_reference = ${reference}, solana_reference = ${reference}, token = 'SOL', updated_at = now() WHERE id = ${shipment.id} AND payment_status = 'pending'`);
    return NextResponse.json({ ok: true, url, reference });
  } catch (error) { console.error("[checkout/create]", error); return NextResponse.json({ ok: false, error: "Solana payment could not be started." }, { status: 500 }); }
}
