import { sql } from "drizzle-orm";
import { bigint, date, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const membershipCards = pgTable("membership_cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicMembershipId: text("public_membership_id").notNull().unique(),
  organizationName: text("organization_name").notNull(),
  memberName: text("member_name").notNull(),
  membershipType: text("membership_type").notNull(),
  expirationDate: date("expiration_date"),
  photoDataUrl: text("photo_data_url"),
  design: jsonb("design").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shippingConfig = pgTable("shipping_config", {
  id: integer("id").primaryKey().default(1),
  baseFeeCents: integer("base_fee_cents").notNull().default(499),
  cardFeeCents: integer("card_fee_cents").notNull().default(0),
  internationalSurchargeCents: integer("international_surcharge_cents").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shipmentOrders = pgTable("shipment_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  cardId: text("card_id").notNull(),
  cardSnapshot: jsonb("card_snapshot").notNull(),
  recipientName: text("recipient_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  street: text("street").notNull(),
  unit: text("unit"),
  city: text("city").notNull(),
  state: text("state"),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull().default("US"),
  shippingCostCents: integer("shipping_cost_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  solanaReference: text("solana_reference").unique(),
  solanaAmountLamports: bigint("solana_amount_lamports", { mode: "number" }),
  solanaUsdRate: numeric("solana_usd_rate", { precision: 12, scale: 4 }),
  paymentProvider: text("payment_provider"),
  solanaSignature: text("solana_signature").unique(),
  paymentReference: text("payment_reference").unique(),
  txSignature: text("tx_signature").unique(),
  amount: numeric("amount", { precision: 30, scale: 9 }),
  token: text("token"),
  usdcAmount: integer("usdc_amount"),
  stripeSessionId: text("stripe_session_id").unique(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cardDesigns = pgTable("card_designs", {
  id: uuid("id").defaultRandom().primaryKey(),
  cardId: uuid("card_id"),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull().default("Untitled design"),
  canvasJson: jsonb("canvas_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const schema = { membershipCards, shippingConfig, shipmentOrders, cardDesigns };
export type MembershipCard = typeof membershipCards.$inferSelect;
export type ShipmentOrder = typeof shipmentOrders.$inferSelect;
export type CardDesign = typeof cardDesigns.$inferSelect;
export type PaymentStatus = "pending" | "paid" | "failed";

export default schema;
