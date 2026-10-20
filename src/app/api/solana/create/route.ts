import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { createSolanaPayUrl } from "@/lib/solana";

export async function POST(req: Request) {
  try {
    const { shipment_id } = await req.json();
    const rows = await db.execute(sql`SELECT id, total_cents, payment_status FROM public.shipment_orders WHERE id = ${shipment_id}`);
    const shipment = rows.rows[0] as { id: string; total_cents: number; payment_status: string } | undefined;
    if (!shipment || shipment.payment_status !== "pending") return NextResponse.json({ ok: false, error: "Shipment is not payable." }, { status: 400 });
    const priceResponse = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", { next: { revalidate: 30 } });
    const price = Number((await priceResponse.json())?.solana?.usd);
    if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ ok: false, error: "Live SOL pricing is temporarily unavailable." }, { status: 503 });
    const amountSol = Number(shipment.total_cents) / 100 / price;
    const amountLamports = Math.ceil(amountSol * 1_000_000_000);
    const reference = crypto.randomBytes(32).toString("hex");
    const referenceBase58 = new PublicKey(Buffer.from(reference, "hex")).toBase58();
    const url = createSolanaPayUrl({ amountSol: amountLamports / 1_000_000_000, reference: referenceBase58 });
    await db.execute(sql`UPDATE public.shipment_orders SET payment_provider = 'solana', payment_reference = ${referenceBase58}, solana_reference = ${referenceBase58}, amount = ${amountSol}, token = 'SOL', solana_amount_lamports = ${amountLamports}, solana_usd_rate = ${price}, payment_status = 'pending', updated_at = now() WHERE id = ${shipment.id} AND payment_status = 'pending'`);
    return NextResponse.json({ ok: true, url, reference: referenceBase58, amount_cents: shipment.total_cents, amount_lamports: amountLamports, sol_usd: price, network: "mainnet-beta" });
  } catch (error) {
    console.error("[solana/create]", error);
    return NextResponse.json({ ok: false, error: "Solana payment could not be created." }, { status: 500 });
  }
}
