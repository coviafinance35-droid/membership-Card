import { CustomFulfillmentProvider } from "./custom";
import type { FulfillmentProvider } from "./types";

export type { FulfillmentProvider, ShippingRate, FulfillmentAddress, FulfillmentOrder } from "./types";
export { CustomFulfillmentProvider } from "./custom";

export function getFulfillmentProvider(name?: string | null): FulfillmentProvider {
  const preferred = (name ?? process.env.FULFILLMENT_PROVIDER ?? "custom").toLowerCase();
  if (preferred === "custom" && process.env.FULFILLMENT_API_URL && process.env.FULFILLMENT_API_KEY) return new CustomFulfillmentProvider();
  throw new Error("provider_not_configured");
}
