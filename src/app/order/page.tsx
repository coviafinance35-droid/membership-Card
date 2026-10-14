"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MembershipCard } from "@/components/card/MembershipCard";
import { SolanaPayment } from "./SolanaPayment";
import { SHIPPING_SERVICES } from "@/lib/shipping";
import type { CardDraft } from "@/lib/types";

type FormState = { full_name: string; street: string; unit: string; city: string; state: string; zip: string; country: string; phone: string; email: string };
const empty: FormState = { full_name: "", street: "", unit: "", city: "", state: "", zip: "", country: "US", phone: "", email: "" };

export default function OrderPage() {
  const [card, setCard] = useState<CardDraft | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const value = window.sessionStorage.getItem("mc_card");
      return value ? JSON.parse(value) as CardDraft : null;
    } catch {
      return null;
    }
  });
  const [form, setForm] = useState<FormState>(empty);
  const [service, setService] = useState<"standard" | "rush">("standard");
  const [step, setStep] = useState<"details" | "payment" | "success">("details");
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid = useMemo(() => Boolean(form.full_name && form.street && form.city && form.zip && form.country === "US"), [form]);
  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function createShipment() {
    if (!card || !valid) return; setBusy(true); setError("");
    try { const response = await fetch("/api/shipping/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, service, card_id: sessionStorage.getItem("mc_card_id") ?? card.memberNumber, card_snapshot: card }) }); const data = await response.json(); if (!data.ok) throw new Error(data.error); setShipmentId(data.shipment.id); setStep("payment"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not prepare payment."); } finally { setBusy(false); }
  }
  if (!card) return <main className="mx-auto max-w-lg px-4 py-16 text-center"><p className="text-muted-foreground">Create a digital card before ordering a physical one.</p><Button asChild className="mt-6"><Link href="/create">Create a card</Link></Button></main>;
  const fields: Array<[keyof FormState, string, boolean]> = [["full_name", "Full name", true], ["street", "Street address", true], ["unit", "Apartment / unit", false], ["city", "City", true], ["state", "State", false], ["zip", "ZIP code", true], ["phone", "Phone number", false]];
  return <main className="min-h-dvh bg-background"><header className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5"><Link href="/create" className="text-muted-foreground"><ArrowLeft className="size-5" /></Link><div><p className="font-display text-lg">Ship your fan card</p><p className="text-xs text-muted-foreground">Secure delivery with tracking included</p></div></header><div className="mx-auto max-w-5xl px-4 pb-16"><div className="mb-6 flex gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"><span className={step === "details" ? "text-primary" : ""}>01 Details</span><span>/</span><span className={step === "payment" ? "text-primary" : ""}>02 Payment</span><span>/</span><span className={step === "success" ? "text-primary" : ""}>03 Complete</span></div>{step === "success" ? <section className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm"><div className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-2xl text-primary-foreground">✓</div><h1 className="mt-5 font-display text-3xl">Payment successful</h1><p className="mt-3 text-muted-foreground">Your card is ready for fulfillment. We&apos;ll email your receipt and tracking updates to <strong>{form.email}</strong>.</p><p className="mt-5 rounded-xl bg-secondary/50 p-4 text-sm">{SHIPPING_SERVICES[service].description}. Your physical card will now move to production.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><Button asChild className="w-full"><Link href="/shipments">View shipment</Link></Button><Button asChild variant="outline" className="w-full"><Link href="/app">View my dashboard</Link></Button></div></section> : <div className="grid gap-8 lg:grid-cols-[1fr_360px]"><section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm"><MembershipCard model={{ organizationName: card.organizationName, memberName: card.memberName, memberNumber: card.memberNumber, membershipType: card.membershipType, expiration: card.expiration, photoUrl: card.photoDataUrl, status: "active", design: card.design }} />{step === "details" ? <><h1 className="font-display text-2xl">Where should we send it?</h1><div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label, required]) => <label key={key} className="grid gap-1.5 text-sm"><span>{label}{required ? " *" : ""}</span><input required={required} value={form[key]} onChange={(event) => update(key, event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3" /></label>)}</div><label className="grid gap-1.5 text-sm"><span>Country *</span><select value={form.country} onChange={(event) => update("country", event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3"><option value="US">United States</option></select></label><div className="grid gap-3 sm:grid-cols-2">{(Object.entries(SHIPPING_SERVICES) as Array<["standard" | "rush", typeof SHIPPING_SERVICES.standard]>).map(([key, option]) => <button type="button" key={key} onClick={() => setService(key)} className={`rounded-xl border p-4 text-left ${service === key ? "border-primary bg-primary/10" : "border-border"}`}><span className="font-medium">{option.label}</span><span className="mt-1 block text-sm text-muted-foreground">{option.description}</span><span className="mt-2 block font-semibold">${(option.amount_cents / 100).toFixed(2)}</span></button>)}</div><Button className="w-full" disabled={!valid || busy} onClick={createShipment}>{busy ? "Preparing payment…" : "Continue to payment"}</Button></> : shipmentId ? <SolanaPayment shipmentId={shipmentId} amountCents={SHIPPING_SERVICES[service].amount_cents} onSuccess={() => setStep("success")} email={form.email} /> : null}{error && <p className="text-sm text-destructive" role="alert">{error}</p>}</section><aside className="rounded-2xl border border-border bg-card p-5"><h2 className="font-display text-xl">Order summary</h2><div className="mt-5 flex justify-between text-sm"><span>{SHIPPING_SERVICES[service].label}</span><strong>${(SHIPPING_SERVICES[service].amount_cents / 100).toFixed(2)}</strong></div><p className="mt-3 text-sm text-muted-foreground">{SHIPPING_SERVICES[service].description}. Email receipt and tracking included.</p></aside></div>}</div></main>;
}
