import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

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

    const supabase = await createServiceClient();
    const { error: cardError } = await supabase.from("membership_cards").insert({ id: cardId, public_membership_id: cardNumber, organization_name: reference ?? accountId, member_name: shipTo.name, membership_type: first.modelId, design: cardSnapshot });
    if (cardError) throw cardError;
    const { error: orderError } = await supabase.from("shipment_orders").insert({ id: orderId, user_id: accountId, card_id: cardId, card_snapshot: cardSnapshot, recipient_name: shipTo.name, email: shipTo.email, phone: shipTo.phone, street: address.addressLine1, city: address.city, postal_code: address.postcode, country: address.countryCode, shipping_cost_cents: 0, total_cents: 0, idempotency_key: idempotencyKey, payment_status: isDraft ? "pending" : "pending", fulfillment_status: "pending" });
    if (orderError) throw orderError;

    return NextResponse.json({ success: true, orderId }, { status: 200 });
  } catch (error) {
    console.error("[accounts/orders]", error);
    return NextResponse.json({ success: false, error: "Order could not be created" }, { status: 500 });
  }
}

