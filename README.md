# MemberCard AI

**Create your membership card with AI.**

Tell us a little about your card — organization name, member name, photo, membership type — and we generate a premium digital card automatically. Optionally order a physical PVC card shipped in the U.S.

## Experience

1. **Home** — Start Creating
2. **AI conversation** — asks only what’s needed
3. **Card ready** — preview, save, share, or order physical
4. **Physical order** — U.S. address → live shipping rates → Solana payment → fulfillment

Card delivery uses Neon for shipment state and Solana transaction verification before fulfillment. The mock provider is available only when `FULFILLMENT_PROVIDER=mock` and `FULFILLMENT_TEST_MODE=true`; production requires a real provider adapter.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Groq AI (`llama-3.3-70b-versatile`) with tool calling
- Solana Pay with Helius transaction verification
- Custom PVC fulfillment provider (`FULFILLMENT_API_URL` + `FULFILLMENT_API_KEY`)

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without `GROQ_API_KEY`, the create flow still walks the same questions and generates a card so you can test the UI.

## Shipping environment

- `DATABASE_URL` — Neon connection string
- `PAYMENT_PROVIDER=solana` — default on-chain payment flow; set `stripe` only for an optional fiat fallback
- `HELIUS_API` or `HELIUS_RPC` — server-side Solana mainnet transaction verification
- `SOLANA_TREASURY` — receiving wallet for card payments
- `FULFILLMENT_PROVIDER=custom` — required for production fulfillment
- `FULFILLMENT_API_URL` and `FULFILLMENT_API_KEY` — server-only provider credentials
- `FULFILLMENT_PROVIDER=mock` plus `FULFILLMENT_TEST_MODE=true` — explicit test-only mode

Shipping is priced from the configured shipping data; a real fulfillment provider account/API is still required before orders can be submitted.

## Deploy (Vercel)

1. Import this repo
2. Set env vars from `.env.example`, including the Solana treasury and Helius RPC settings
3. Deploy
