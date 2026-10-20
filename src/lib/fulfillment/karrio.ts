import type { CreateFulfillmentOrderInput, FulfillmentAddress, FulfillmentOrder, FulfillmentProvider, FulfillmentProduct, ShippingRate } from "./types";

/** Karrio's normalized REST API adapter for a self-hosted deployment. */
export class KarrioFulfillmentProvider implements FulfillmentProvider {
  id = "karrio";
  private get config() {
    const base = process.env.KARRIO_API_URL?.replace(/\/$/, "");
    const key = process.env.KARRIO_API_KEY;
    if (!base || !key) throw new Error("Karrio is not configured.");
    return { base, key };
  }
  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const { base, key } = this.config;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${base}/v1${path}`, {
        ...init,
        signal: controller.signal,
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json", ...(init?.headers ?? {}) },
      });
      const body = await response.text();
      if (!response.ok) throw new Error(`Karrio returned ${response.status}.`);
      return (body ? JSON.parse(body) : {}) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
  async getProducts(): Promise<FulfillmentProduct[]> {
    return [{ sku: "member-card-pvc", name: "PVC membership card", description: "Physical membership card", unit_cents: 0, currency: "usd" }];
  }
  async getShippingRates(address: FulfillmentAddress): Promise<ShippingRate[]> {
    const shipment = await this.request<{ id: string }>("/shipments", { method: "POST", body: JSON.stringify({ recipient: { person_name: address.full_name, address_line1: address.street, address_line2: address.unit, city_locality: address.city, state_province: address.state, postal_code: address.zip, country_code: address.country, phone: address.phone } }) });
    const result = await this.request<{ rates?: Array<{ id: string; carrier_name?: string; service?: string; shipping_amount?: { amount: number; currency: string }; delivery_days?: number }> }>(`/shipments/${shipment.id}/rates`, { method: "POST" });
    return (result.rates ?? []).map((rate) => ({ service: rate.service ?? rate.id, service_code: rate.id, carrier: rate.carrier_name ?? "Karrio", amount_cents: Math.round((rate.shipping_amount?.amount ?? 0) * 100), currency: (rate.shipping_amount?.currency ?? "usd").toLowerCase(), estimated_days: rate.delivery_days ?? 7 }));
  }
  async createOrder(input: CreateFulfillmentOrderInput): Promise<FulfillmentOrder> {
    const result = await this.request<{ id: string }>("/shipments", { method: "POST", headers: { "Idempotency-Key": input.idempotency_key }, body: JSON.stringify({ recipient: { person_name: input.address.full_name, address_line1: input.address.street, address_line2: input.address.unit, city_locality: input.address.city, state_province: input.address.state, postal_code: input.address.zip, country_code: input.address.country, phone: input.address.phone }, parcels: [{ weight: { value: 1, unit: "ounce" }, description: "PVC membership card", quantity: input.quantity }], metadata: { card_id: input.artwork.card_id } }) });
    return { id: result.id, status: "created" };
  }
  async submitOrder(id: string): Promise<FulfillmentOrder> {
    const result = await this.request<{ shipment_id?: string; tracking_number?: string; tracking_url?: string }>(`/shipments/${id}/purchase`, { method: "POST" });
    return { id, status: "submitted", tracking_number: result.tracking_number, tracking_url: result.tracking_url };
  }
  async getOrder(id: string): Promise<FulfillmentOrder> { return this.getTracking(id); }
  async getTracking(id: string): Promise<FulfillmentOrder> { const result = await this.request<{ tracking_number?: string; tracking_url?: string; status?: string }>(`/shipments/${id}`); return { id, status: result.status === "delivered" ? "delivered" : "shipped", tracking_number: result.tracking_number, tracking_url: result.tracking_url }; }
  async cancelOrder(id: string): Promise<FulfillmentOrder> { await this.request(`/shipments/${id}/cancel`, { method: "POST" }); return { id, status: "cancelled" }; }
}
