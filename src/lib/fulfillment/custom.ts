import type {
  CreateFulfillmentOrderInput, FulfillmentOrder, FulfillmentProduct,
  FulfillmentProvider, ShippingRate,
} from "./types";

/** Production PVC provider — credentials only in FULFILLMENT_API_URL / FULFILLMENT_API_KEY. */
export class CustomFulfillmentProvider implements FulfillmentProvider {
  id = "custom";
  private get base() {
    const url = process.env.PRODIGI_API ?? process.env.FULFILLMENT_API_URL;
    const key = process.env.FULFILLMENT_API_KEY;
    if (!url || !key) throw new Error("Fulfillment provider is not configured.");
    return { url: url.replace(/\/$/, ""), key };
  }
  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const { url, key } = this.base;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(`${url}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json", ...(init?.headers ?? {}) },
      });
      const body = await res.text();
      if (!res.ok) throw new Error(`Fulfillment provider returned ${res.status}.`);
      return (body ? JSON.parse(body) : {}) as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("Fulfillment provider timed out.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  async getProducts() {
    const products = await this.req<FulfillmentProduct[]>("/products");
    if (!Array.isArray(products)) throw new Error("Fulfillment provider returned invalid products.");
    return products;
  }
  async getShippingRates(address: CreateFulfillmentOrderInput["address"]) {
    const rates = await this.req<ShippingRate[]>("/shipping/rates", { method: "POST", body: JSON.stringify({ address }) });
    if (!Array.isArray(rates) || rates.some((rate) => !Number.isInteger(rate.amount_cents) || rate.amount_cents < 0)) throw new Error("Fulfillment provider returned invalid shipping rates.");
    return rates;
  }
  async createOrder(input: CreateFulfillmentOrderInput) {
    const order = await this.req<FulfillmentOrder>("/orders", {
      method: "POST", body: JSON.stringify(input),
      headers: { "Idempotency-Key": input.idempotency_key },
    });
    if (!order?.id || !order.status) throw new Error("Fulfillment provider returned an invalid order.");
    return order;
  }
  submitOrder(id: string) { return this.req<FulfillmentOrder>(`/orders/${id}/submit`, { method: "POST" }); }
  getOrder(id: string) { return this.req<FulfillmentOrder>(`/orders/${id}`); }
  getTracking(id: string) { return this.req<FulfillmentOrder>(`/orders/${id}/tracking`); }
  cancelOrder(id: string) { return this.req<FulfillmentOrder>(`/orders/${id}/cancel`, { method: "POST" }); }
}
