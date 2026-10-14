import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { SOLANA_TREASURY } from "@/lib/solana";

const rpcUrl = () => {
  const configured = process.env.HELIUS_RPC;
  if (configured) return configured.includes("api-key=") || configured.includes("apiKey=") ? configured : `${configured}${configured.includes("?") ? "&" : "?"}api-key=${encodeURIComponent(process.env.HELIUS_API ?? "")}`;
  return `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(process.env.HELIUS_API ?? "")}`;
};

async function heliusRpc(method: string, params: unknown[], id: number) {
  const response = await fetch(rpcUrl(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id, method, params }), cache: "no-store" });
  if (!response.ok) throw new Error(`Helius RPC returned ${response.status}.`);
  const payload = await response.json();
  if (payload.error) throw new Error("Helius RPC rejected the request.");
  return payload.result;
}

export async function POST(req: Request) {
  try {
    const { shipment_id, signature, email } = await req.json();
    if (!shipment_id || typeof signature !== "string" || signature.length < 80 || typeof email !== "string" || !email.includes("@")) return NextResponse.json({ ok: false, error: "A valid payment signature is required." }, { status: 400 });
    if (!process.env.HELIUS_API && !process.env.HELIUS_RPC) return NextResponse.json({ ok: false, error: "Solana verification is not configured." }, { status: 503 });
    const rows = await db.execute(sql`SELECT id, total_cents, solana_reference, solana_amount_lamports, payment_status FROM public.shipment_orders WHERE id = ${shipment_id}`);
    const order = rows.rows[0] as { id: string; total_cents: number; solana_reference: string | null; solana_amount_lamports: number | null; payment_status: string } | undefined;
    if (!order || !order.solana_reference || order.payment_status !== "pending") return NextResponse.json({ ok: false, error: "Payment intent is unavailable." }, { status: 400 });
    const signatures = await heliusRpc("getSignaturesForAddress", [order.solana_reference, { limit: 20 }], 1) as Array<{ signature: string; err: unknown }> | undefined;
    if (!signatures?.some((item) => item.signature === signature && !item.err)) return NextResponse.json({ ok: false, error: "Payment signature was not found for this payment reference." }, { status: 400 });
    const transaction = await heliusRpc("getTransaction", [signature, { encoding: "jsonParsed", commitment: "finalized", maxSupportedTransactionVersion: 0 }], 2);
    if (!transaction?.meta || transaction.meta.err || !transaction.blockTime) return NextResponse.json({ ok: false, error: "Payment is not finalized." }, { status: 400 });
    const keys = transaction.transaction.message.accountKeys as Array<{ pubkey: string; signer?: boolean }>;
    const accountKeySet = new Set(keys.map((key) => key.pubkey));
    if (!accountKeySet.has(order.solana_reference)) return NextResponse.json({ ok: false, error: "Payment reference does not match this order." }, { status: 400 });
    const instructions = transaction.transaction.message.instructions as Array<{ program?: string; parsed?: { type?: string; info?: { destination?: string; lamports?: number } } }>;
    const receivedLamports = instructions.reduce((total, instruction) => {
      const info = instruction.parsed?.info;
      return instruction.program === "system" && instruction.parsed?.type === "transfer" && info?.destination === SOLANA_TREASURY ? total + Number(info.lamports ?? 0) : total;
    }, 0);
    const requiredLamports = Number(order.solana_amount_lamports);
    if (!Number.isSafeInteger(requiredLamports) || requiredLamports <= 0) return NextResponse.json({ ok: false, error: "Payment intent amount is unavailable." }, { status: 400 });
    if (receivedLamports < requiredLamports) return NextResponse.json({ ok: false, error: "Payment amount is lower than the order total." }, { status: 400 });
    await db.execute(sql`UPDATE public.shipment_orders SET payment_status = 'paid', solana_signature = ${signature}, email = ${email.toLowerCase().trim()}, paid_at = now(), updated_at = now() WHERE id = ${order.id} AND payment_status = 'pending'`);
    return NextResponse.json({ ok: true, paid: true });
  } catch (error) {
    console.error("[solana/verify]", error);
    return NextResponse.json({ ok: false, error: "Payment verification failed." }, { status: 500 });
  }
}
