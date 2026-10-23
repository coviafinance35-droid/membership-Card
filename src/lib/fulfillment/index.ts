import { CustomFulfillmentProvider } from "./custom";
import { KarrioFulfillmentProvider } from "./karrio";
import { AACardsFulfillmentProvider } from "./aa-cards";
import type { FulfillmentProvider } from "./types";

export type { FulfillmentProvider, ShippingRate, FulfillmentAddress, FulfillmentOrder } from "./types";
export { CustomFulfillmentProvider } from "./custom";
export { KarrioFulfillmentProvider } from "./karrio";
export { AACardsFulfillmentProvider } from "./aa-cards";

export function getFulfillmentProvider(name?: string | null): FulfillmentProvider {
  const preferred = (name ?? process.env.FULFILLMENT_PROVIDER ?? "custom").toLowerCase();
  if (preferred === "karrio" && process.env.KARRIO_API_URL && process.env.KARRIO_API_KEY) return new KarrioFulfillmentProvider();
  if (preferred === "custom" && process.env.FULFILLMENT_API_URL && process.env.FULFILLMENT_API_KEY) return new CustomFulfillmentProvider();
  if (preferred === "aa-cards" && process.env.AA_CARDS_API_URL && process.env.AA_CARDS_DECK_ID && process.env.AA_CARDS_API_KEY) return new AACardsFulfillmentProvider();
  throw new Error("provider_not_configured");
}
