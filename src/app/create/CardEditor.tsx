"use client";

import { useState } from "react";
import { ArrowLeft, Check, Download, Package, Share2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MembershipCard } from "@/components/card/MembershipCard";
import FabricDesigner from "./FabricDesigner";
import type { CardDraft } from "@/lib/types";

const themes = [
  { name: "Teal", value: "#0f7378", secondary: "#e7f2ef", accent: "#9ad6cc", text: "#f7fbfa" },
  { name: "Black", value: "#1b2224", secondary: "#eef1ef", accent: "#afc0bc", text: "#fbfcfb" },
  { name: "White", value: "#f5f3ed", secondary: "#f5f3ed", accent: "#0f7378", text: "#17383c" },
];

export function CardEditor({ initial }: { initial: CardDraft }) {
  const [card, setCard] = useState<CardDraft>(initial);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = themes.find((item) => item.value === card.design.primary_color) ?? themes[0];

  function update(patch: Partial<CardDraft>) { setCard((current) => ({ ...current, ...patch })); setSavedId(null); }
  function updateDesign(primary: string) {
    const next = themes.find((item) => item.value === primary) ?? themes[0];
    update({ design: { ...card.design, primary_color: next.value, secondary_color: next.secondary, accent_color: next.accent, text_color: next.text } });
  }
  async function save() {
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/cards/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(card) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Unable to save card");
      const saved = { ...card, memberNumber: data.member_number };
      setCard(saved); setSavedId(data.card_id);
      sessionStorage.setItem("mc_card", JSON.stringify(saved));
      sessionStorage.setItem("mc_card_id", data.card_id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The card could not be saved. Please try again.");
    }
    finally { setSaving(false); }
  }
  function exportCard() {
    const node = document.querySelector("[data-card-preview]") as HTMLElement | null;
    if (!node) return;
    const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 760;
    const context = canvas.getContext("2d"); if (!context) return;
    context.fillStyle = theme.value; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = theme.text; context.font = "bold 64px Georgia"; context.fillText(card.memberName, 80, 520);
    context.font = "28px monospace"; context.fillText(card.memberNumber, 80, 610);
    const link = document.createElement("a"); link.download = `${card.memberNumber}.png`; link.href = canvas.toDataURL("image/png"); link.click();
  }
  const model = { organizationName: card.organizationName, memberName: card.memberName, memberNumber: card.memberNumber, membershipType: card.membershipType, expiration: card.expiration, photoUrl: card.photoDataUrl, status: card.status, design: card.design };

  return <main className="min-h-dvh bg-background">
    <header className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-5"><Link href="/" className="text-muted-foreground"><ArrowLeft className="size-5" /></Link><span className="font-display text-lg">Create your membership card</span><span className="ml-auto text-xs text-muted-foreground">01 Design <span className="mx-2">—</span> 02 Review <span className="mx-2">—</span> 03 Delivery</span></header>
    <div className="mx-auto grid max-w-6xl gap-6 px-5 pb-12 lg:grid-cols-[1.35fr_0.85fr]">
      <section className="rounded-2xl border bg-card p-5 shadow-soft md:p-7"><p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Card preview</p><h1 className="mt-2 font-display text-3xl">Make it unmistakably yours.</h1><div data-card-preview className="mt-7 grid gap-5 sm:grid-cols-2"><div><div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"><span>Front</span><span>Digital</span></div><MembershipCard model={model} face="front" className="w-full" /></div><div><div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"><span>Back</span><span>Verification</span></div><MembershipCard model={model} face="back" className="w-full" /></div></div><div className="mt-6"><FabricDesigner onChange={() => setSavedId(null)} /></div>
        <div className="mt-6 grid grid-cols-3 gap-3">{themes.map((item) => <button key={item.name} type="button" onClick={() => updateDesign(item.value)} className={`rounded-xl border p-2 text-left ${theme.name === item.name ? "border-primary ring-2 ring-primary/20" : "border-border"}`}><div className="cr80 rounded-lg" style={{ background: item.value }} /><span className="mt-2 block text-center text-xs">{item.name}</span></button>)}</div>
      </section>
      <aside className="space-y-5"><section className="rounded-2xl border bg-card p-5 shadow-soft"><p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Card information</p><div className="mt-4 grid gap-3">{[["Organization", "organizationName", card.organizationName], ["Member name", "memberName", card.memberName], ["Membership level", "membershipType", card.membershipType], ["Membership ID", "memberNumber", card.memberNumber]].map(([label, key, value]) => <label key={key} className="grid gap-1.5 text-sm"><span className="text-muted-foreground">{label}</span><input value={value} onChange={(event) => update({ [key]: event.target.value } as Partial<CardDraft>)} className="h-11 rounded-lg border bg-background px-3 outline-none focus:ring-2 focus:ring-ring" /></label>)}<label className="grid gap-1.5 text-sm"><span className="text-muted-foreground">Expiry date</span><input type="date" value={card.expiration ?? ""} onChange={(event) => update({ expiration: event.target.value })} className="h-11 rounded-lg border bg-background px-3 outline-none focus:ring-2 focus:ring-ring" /></label></div></section>
        <section className="rounded-2xl border bg-card p-5 shadow-soft"><div className="flex items-center justify-between"><span>Design cost</span><strong>$0.00</strong></div><div className="mt-4 flex items-center justify-between"><span>Digital membership card</span><span className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">Included</span></div><div className="mt-5 grid gap-2"><Button onClick={() => void save()} disabled={saving}>{savedId ? <Check className="size-4" /> : null}{saving ? "Saving…" : savedId ? "Card saved to Neon" : "Save membership card"}</Button><Button variant="outline" onClick={exportCard}><Download className="size-4" /> Export PNG</Button><Button variant="outline" onClick={() => navigator.share?.({ title: "Membership card", text: `${card.memberName} · ${card.memberNumber}` })}><Share2 className="size-4" /> Share card</Button>{savedId && <Button variant="secondary" asChild><Link href="/order"><Package className="size-4" /> Continue to delivery</Link></Button>}</div>{error && <p className="mt-3 text-sm text-destructive">{error}</p>}</section></aside>
    </div>
  </main>;
}
