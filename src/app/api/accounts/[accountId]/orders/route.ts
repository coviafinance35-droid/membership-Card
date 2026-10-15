import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const modelIds = [
  "pvccard_white",
  "mifare1k_pvccard_white",
  "ntag213_pvccard_white",
  "ntag216_pvccard_white",
  "ntag424_pvccard_white",
  "ntag424_woodcard",
] as const;

const nfcSchema = z.object({
  type: z.enum(["empty", "uri", "text", "dynamic"]),
  content: z.string().max(4096).optional(),
  dynamic: z.record(z.string(), z.unknown()).optional(),
  options: z.object({ lock: z.boolean().optional(), uid: z.boolean().optional() }).optional(),
});

const orderSchema = z.object({
  isDraft: z.boolean().optional().default(false),
  reference: z.string().max(120).optional(),
  carrierServiceId: z.string().max(80).optional().default("lpf_standard"),
  shipTo: z.object({
    name: z.string().min(1).max(38),
    phone: z.string().min(1).max(40),
    email: z.string().email(),
    address: z.object({
      addressLine1: z.string().min(1).max(38),
      addressLine2: z.string().max(38).nullable().optional(),
      city: z.string().min(1).max(35),
      postcode: z.string().min(1).max(20),
      countryCode: z.string().regex(/^[A-Z]{2}$/),
    }).optional(),
    servicePoint: z.object({ id: z.string().min(1), country: z.string().regex(/^[A-Z]{2}$/) }).optional(),
  }).refine((value) => value.address || value.servicePoint, { message: "shipTo requires address or servicePoint" }),
  products: z.array(z.object({ quantity: z.number().int().min(1).max(1000), modelId: z.enum(modelIds), metadata: z.record(z.string(), z.unknown()).optional(), packagingId: z.string().max(120).optional(), printingVisuals: z.array(z.string().uuid()).optional(), nfc: z.union([nfcSchema, z.array(nfcSchema)]).optional() })).optional(),
  groups: z.array(z.object({ quantity: z.number().int().min(1).max(1000), modelId: z.enum(modelIds), metadata: z.record(z.string(), z.unknown()).optional(), packagingId: z.string().max(120).optional(), printingVisuals: z.array(z.string().uuid()).optional(), nfc: z.union([nfcSchema, z.array(nfcSchema)]).optional() })).optional(),
}).superRefine((value, ctx) => {
  const items = [...(value.products ?? []), ...(value.groups ?? [])];
  if (items.length === 0) ctx.addIssue({ code: "custom", path: ["products"], message: "At least one product is required" });
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  try {
    const { accountId } = await params;
    if (!accountId?.trim()) return NextResponse.json({ success: false, error: "Account ID is required" }, { status: 400 });
    const parsed = orderSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid order", details: parsed.error.flatten() }, { status: 400 });

    const { shipTo, products, groups, isDraft, reference } = parsed.data;
    const items = [...(products ?? []), ...(groups ?? [])];
    const first = items[0];
    const cardId = randomUUID();
    const orderId = randomUUID();
    const idempotencyKey = reference ? `api_${accountId}_${reference}` : `api_${orderId}`;
    const address = shipTo.address;
    if (!address) return NextResponse.json({ success: false, error: "Service-point orders are not supported without a street address" }, { status: 400 });
    const cardSnapshot = { modelId: first.modelId, products: items, reference: reference ?? null };
    const cardNumber = `api-${cardId}`;

    await db.transaction(async (tx) => {
      await tx.execute(sql`INSERT INTO public.membership_cards (id, public_membership_id, organization_name, member_name, membership_type, design) VALUES (${cardId}::uuid, ${cardNumber}, ${reference ?? accountId}, ${shipTo.name}, ${first.modelId}, ${JSON.stringify(cardSnapshot)}::jsonb)`);
      await tx.execute(sql`INSERT INTO public.shipment_orders (id, user_id, card_id, card_snapshot, recipient_name, email, phone, street, city, postal_code, country, shipping_cost_cents, total_cents, idempotency_key, payment_status, fulfillment_status) VALUES (${orderId}::uuid, ${accountId}, ${cardId}::uuid, ${JSON.stringify(cardSnapshot)}::jsonb, ${shipTo.name}, ${shipTo.email}, ${shipTo.phone}, ${address.addressLine1}, ${address.city}, ${address.postcode}, ${address.countryCode}, 0, 0, ${idempotencyKey}, ${isDraft ? "draft" : "pending"}, "pending")`);
    });

    return NextResponse.json({ success: true, orderId }, { status: 200 });
  } catch (error) {
    console.error("[accounts/orders]", error);
    return NextResponse.json({ success: false, error: "Order could not be created" }, { status: 500 });
  }
}

