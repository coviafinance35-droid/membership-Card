import type { CardDesign } from "@/lib/types";
import type { CreateFulfillmentOrderInput, FulfillmentAddress, FulfillmentOrder, FulfillmentProduct, FulfillmentProvider, ShippingRate } from "./types";

type ApiResponse = Record<string, unknown> & { _errors?: Array<{ description?: string }> };

function config() {
  const deckId = process.env.AA_CARDS_DECK_ID;
  const apiKey = process.env.AA_CARDS_API_KEY;
  const baseUrl = process.env.AA_CARDS_API_URL ?? "https://cards.aa.net.uk/api.cgi";
  if (!deckId || !apiKey) throw new Error("aa_cards_not_configured");
  return { deckId, apiKey, baseUrl };
}

async function request(body?: unknown, method: "GET" | "POST" = "GET") {
  const { deckId, apiKey, baseUrl } = config();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(baseUrl, {
      method,
      signal: controller.signal,
      headers: { Authorization: `Basic ${Buffer.from(`${deckId}:${apiKey}`).toString("base64")}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const data = await response.json() as ApiResponse;
    const errors = Array.isArray(data._errors) ? data._errors.map((error) => error.description || "A&A API error").join("; ") : "";
    if (!response.ok || errors) throw new Error(errors || `aa_cards_http_${response.status}`);
    return data;
  } finally { clearTimeout(timeout); }
}

function fieldMap(design: CardDesign) {
  const mapping = process.env.AA_CARDS_FIELD_MAP ? JSON.parse(process.env.AA_CARDS_FIELD_MAP) as Record<string, string> : {};
  return { mapping, design };
}

export class AACardsFulfillmentProvider implements FulfillmentProvider {
  readonly id = "aa-cards";

  async getProducts(): Promise<FulfillmentProduct[]> {
    return [{ sku: "aa-card", name: "PVC membership card", description: "Printed by A&A Cards", unit_cents: Number(process.env.AA_CARDS_UNIT_PRICE_CENTS ?? 0), currency: "GBP" }];
  }

  async getShippingRates(_address: FulfillmentAddress): Promise<ShippingRate[]> {
    throw new Error("aa_cards_shipping_rates_unavailable");
  }

  async createOrder(input: CreateFulfillmentOrderInput): Promise<FulfillmentOrder> {
    const artwork = input.artwork;
    const { mapping } = fieldMap(artwork.design);
    const fields: Record<string, string> = {};
    const values: Record<string, string | null> = {
      organization_name: artwork.organization_name, member_name: artwork.member_name,
      membership_type: artwork.membership_type, member_number: artwork.member_number,
      expiration_date: artwork.expiration_date,
    };
    for (const [key, value] of Object.entries(values)) if (value) fields[mapping[key] || key] = value;
    const card = await request(fields, "POST");
    const cardId = String(card._cardid || "");
    if (!cardId) throw new Error("aa_cards_missing_card_id");
    const order = await request({ _order: { cards: [cardId], reference: input.idempotency_key, delivery: { name: input.address.full_name, address: [input.address.street, input.address.unit].filter(Boolean), posttown: input.address.city, postcode: input.address.zip, tel: input.address.phone || undefined } } }, "POST");
    return { id: String(order._orderno || cardId), status: "submitted", carrier: "A&A Cards" };
  }

  async submitOrder(id: string) { return this.getOrder(id); }
  async getOrder(id: string): Promise<FulfillmentOrder> {
    const data = await request({ _cardid: id }, "POST");
    return { id, status: Number(data._prints || 0) > 0 ? "in_production" : "submitted", tracking_number: null, tracking_url: null };
  }
  async getTracking(id: string) { return this.getOrder(id); }
  async cancelOrder(_id: string): Promise<FulfillmentOrder> { throw new Error("aa_cards_cancellation_unavailable"); }
}
