import { z } from "zod";

export const shippingSchema = z.object({
  card_id: z.string().min(1),
  full_name: z.string().min(2).max(120),
  street: z.string().min(3).max(160),
  unit: z.string().max(40).optional(),
  city: z.string().min(2).max(80),
  state: z.string().max(80).optional(),
  zip: z.string().min(3).max(20),
  country: z.string().length(2),
  phone: z.string().min(7).max(30).optional(),
  email: z.string().email(),
  service: z.enum(["standard", "rush"]).default("standard"),
  card_snapshot: z.record(z.unknown()),
});

export type ShippingInput = z.infer<typeof shippingSchema>;
export const SHIPPING_SERVICES = {
  standard: { label: "Standard Delivery", description: "Estimated 2–3 weeks", amount_cents: 1400, estimated_days: 21, window: "2–3 weeks" },
  rush: { label: "Express Delivery", description: "Estimated 24–48 hours", amount_cents: 1800, estimated_days: 2, window: "24–48 hours" },
} as const;
export type ShippingService = keyof typeof SHIPPING_SERVICES;
export type ShipmentStatus = "pending" | "payment_confirmed" | "processing" | "shipped" | "in_transit" | "delivered" | "failed" | "cancelled" | "refunded";

export function quoteShipping(country: string, config?: { base_fee_cents?: number; card_fee_cents?: number; international_surcharge_cents?: number }) {
  const base = config?.base_fee_cents ?? 699;
  const card = config?.card_fee_cents ?? 0;
  const international = country.toUpperCase() === "US" ? 0 : (config?.international_surcharge_cents ?? 1200);
  return { shipping_cost_cents: base + card + international, currency: "usd", estimated_days: country.toUpperCase() === "US" ? 7 : 18 };
}

export const timeline = ["pending", "payment_confirmed", "processing", "shipped", "in_transit", "delivered"] as const;
