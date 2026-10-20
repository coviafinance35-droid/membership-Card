import type {
  CreateFulfillmentOrderInput,
  FulfillmentAddress,
  FulfillmentOrder,
  FulfillmentProduct,
  FulfillmentProvider,
  ShippingRate,
} from "@/lib/fulfillment/types";

type PrintagsResponse = {
  account?: { id?: string };
  rates?: Array<Record<string, unknown>>;
  shipping_rates?: Array<Record<string, unknown>>;
  products?: Array<Record<string, unknown>>;
  order?: Record<string, unknown>;
  [key: string]: unknown;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for Printags fulfillment.`);
  return value;
}

function numberValue(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeRate(rate: Record<string, unknown>, index: number): ShippingRate {
  const amount = numberValue(rate.amount_cents ?? rate.price_cents ?? rate.amount ?? rate.price);
  const days = Math.max(1, Math.round(numberValue(rate.estimated_days ?? rate.delivery_days ?? rate.days, 7)));
  return {
    service: String(rate.name ?? rate.service ?? rate.label ?? `Printags service ${index + 1}`),
    service_code: String(rate.id ?? rate.service_id ?? rate.code ?? `printags-rate-${index}`),
    carrier: String(rate.carrier ?? "Printags"),
    amount_cents: amount < 100 ? Math.round(amount * 100) : Math.round(amount),
    currency: String(rate.currency ?? "usd").toLowerCase(),
    estimated_days: days,
  };
}

function normalizeOrder(value: unknown, fallbackId: string): FulfillmentOrder {
  const order = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    id: String(order.id ?? order.order_id ?? fallbackId),
    status: (String(order.status ?? "created") as FulfillmentOrder["status"]),
    tracking_number: order.tracking_number ? String(order.tracking_number) : null,
    tracking_url: order.tracking_url ? String(order.tracking_url) : null,
    carrier: order.carrier ? String(order.carrier) : "Printags",
    estimated_delivery: order.estimated_delivery ? String(order.estimated_delivery) : null,
  };
}

class PrintagsProvider implements FulfillmentProvider {
  id = "printags";
  private accountId?: string;

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const baseUrl = requiredEnv("PRINTAGS_API_BASE_URL").replace(/\/$/, "");
    const token = requiredEnv("PRINTAGS_API_TOKEN");
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Printags API ${response.status}: ${(await response.text()).slice(0, 500)}`);
    return response.json() as Promise<T>;
  }

  private async getAccountId() {
    if (this.accountId) return this.accountId;
    const response = await this.request<PrintagsResponse>("/accounts/@me");
    const accountId = response.account?.id;
    if (!accountId) throw new Error("Printags account id was not returned by /accounts/@me.");
    this.accountId = String(accountId);
    return this.accountId;
  }

  async getProducts(): Promise<FulfillmentProduct[]> {
    const accountId = await this.getAccountId();
    const response = await this.request<PrintagsResponse>(`/accounts/${encodeURIComponent(accountId)}/products`);
    return (response.products ?? []).map((product) => ({
      sku: String(product.sku ?? product.id ?? "member-card-pvc"),
      name: String(product.name ?? "Membership card"),
      description: String(product.description ?? "Printed membership card"),
      unit_cents: Math.round(numberValue(product.unit_cents ?? product.price_cents ?? product.price, 125)),
      currency: String(product.currency ?? "usd").toLowerCase(),
    }));
  }

  async getShippingRates(address: FulfillmentAddress) {
    const accountId = await this.getAccountId();
    const response = await this.request<PrintagsResponse>(`/accounts/${encodeURIComponent(accountId)}/shipping/rates`, {
      method: "POST",
      body: JSON.stringify({ address }),
    });
    const rates = response.rates ?? response.shipping_rates ?? [];
    if (!Array.isArray(rates) || rates.length === 0) throw new Error("Printags returned no shipping rates.");
    return rates.map(normalizeRate);
  }

  async createOrder(input: CreateFulfillmentOrderInput) {
    const accountId = await this.getAccountId();
    const response = await this.request<PrintagsResponse>(`/accounts/${encodeURIComponent(accountId)}/orders`, {
      method: "POST",
      headers: { "Idempotency-Key": input.idempotency_key },
      body: JSON.stringify({
        reference: input.idempotency_key,
        products: [{ sku: input.product_sku, quantity: input.quantity, artwork: input.artwork }],
        shipping: { serviceId: input.shipping.service_code, address: input.address },
      }),
    });
    return normalizeOrder(response.order ?? response, input.idempotency_key);
  }

  async submitOrder(id: string) {
    const accountId = await this.getAccountId();
    const response = await this.request<PrintagsResponse>(`/accounts/${encodeURIComponent(accountId)}/orders/${encodeURIComponent(id)}/submit`, { method: "POST" });
    return normalizeOrder(response.order ?? response, id);
  }

  async getOrder(id: string) {
    const accountId = await this.getAccountId();
    const response = await this.request<PrintagsResponse>(`/accounts/${encodeURIComponent(accountId)}/orders/${encodeURIComponent(id)}`);
    return normalizeOrder(response.order ?? response, id);
  }

  async getTracking(id: string) { return this.getOrder(id); }

  async cancelOrder(id: string) {
    const accountId = await this.getAccountId();
    const response = await this.request<PrintagsResponse>(`/accounts/${encodeURIComponent(accountId)}/orders/${encodeURIComponent(id)}/cancel`, { method: "POST" });
    return normalizeOrder(response.order ?? response, id);
  }
}

export function getFulfillmentProvider(_providerName?: string): FulfillmentProvider {
  return new PrintagsProvider();
}
