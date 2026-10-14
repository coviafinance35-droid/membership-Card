import Link from "next/link";
import { ArrowRight, Boxes, CreditCard, Package, Sparkles, Truck, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: WandSparkles, title: "AI card studio", text: "Describe your club, upload a photo, and get a polished membership card in minutes." },
  { icon: CreditCard, title: "Digital-ready cards", text: "Create a shareable card with member details, status, number, and custom visual direction." },
  { icon: Truck, title: "Physical delivery", text: "Review your address, see the live delivery price, and send a premium card around the world." },
  { icon: Package, title: "Track every order", text: "Follow payment, production, shipping, and delivery progress from one clear dashboard." },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh overflow-hidden bg-background bg-grid"><div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[34rem] bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.16),transparent_65%)]" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">M</span><span className="font-display text-xl">MemberCard AI</span></Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex"><Link href="/app" className="hover:text-foreground">Dashboard</Link><Link href="/shipments" className="hover:text-foreground">Delivery</Link><Link href="/create" className="hover:text-foreground">Card studio</Link></nav>
        <Button asChild size="sm"><Link href="/app">Open dashboard <ArrowRight className="size-4" /></Link></Button>
      </header>
      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
          <div><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"><Sparkles className="size-3.5 text-primary" /> The membership card workspace</div><h1 className="max-w-3xl font-display text-5xl leading-[1.04] tracking-tight text-balance md:text-7xl">Make belonging feel official.</h1><p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">Design a beautiful membership fan card with AI, save it as a digital credential, and ship a physical card to your members.</p><div className="mt-9 flex flex-wrap gap-3"><Button asChild size="lg"><Link href="/create">Create a card <ArrowRight className="size-4" /></Link></Button><Button asChild variant="outline" size="lg"><Link href="/app">Explore dashboard</Link></Button></div><div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground"><span>AI-assisted design</span><span>Configurable shipping</span><span>Global delivery tracking</span></div></div>
          <div className="relative"><div className="relative rounded-[2rem] border border-primary/20 bg-card/95 p-4 shadow-card backdrop-blur md:p-6"><div className="flex items-center justify-between border-b border-border pb-4"><div><p className="text-xs uppercase tracking-[.18em] text-muted-foreground">MemberCard / Preview</p><p className="mt-1 font-display text-2xl">Your community, in hand.</p></div><Boxes className="size-6 text-primary" /></div><div className="mt-5 rounded-2xl bg-primary p-6 text-primary-foreground shadow-[0_18px_50px_hsl(var(--primary)/0.25)]"><div className="flex items-start justify-between"><span className="text-xs uppercase tracking-[.2em] opacity-70">Founding member</span><span className="rounded-full border border-primary-foreground/30 px-2 py-1 text-[10px]">ACTIVE</span></div><div className="mt-20"><p className="text-xs opacity-70">MEMBER NAME</p><p className="mt-1 font-display text-3xl">Alex Morgan</p><div className="mt-5 flex justify-between text-xs opacity-75"><span>MC-2048-019</span><span>2026 / 12</span></div></div></div><div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs"><div className="rounded-xl bg-secondary p-3"><p className="text-lg font-semibold">01</p><p className="text-muted-foreground">Design</p></div><div className="rounded-xl bg-secondary p-3"><p className="text-lg font-semibold">02</p><p className="text-muted-foreground">Review</p></div><div className="rounded-xl bg-secondary p-3"><p className="text-lg font-semibold">03</p><p className="text-muted-foreground">Deliver</p></div></div></div></div>
        </section>
        <section className="border-y border-border bg-card/50"><div className="mx-auto max-w-6xl px-5 py-16 lg:px-8"><div className="max-w-xl"><p className="text-xs uppercase tracking-[.18em] text-primary">Everything in one workspace</p><h2 className="mt-3 font-display text-4xl text-balance">From first idea to front-door delivery.</h2></div><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-border bg-background p-5"><Icon className="size-5 text-primary" /><h3 className="mt-8 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div></div></section>
        <section className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-16 md:flex-row md:items-center md:justify-between lg:px-8"><div><h2 className="font-display text-3xl">Ready to make your card?</h2><p className="mt-2 text-muted-foreground">Start with a conversation. Finish with something members keep.</p></div><Button asChild size="lg"><Link href="/create">Start creating <ArrowRight className="size-4" /></Link></Button></section>
      </main>
    </div>
  );
}
