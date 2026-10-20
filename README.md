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
- x402 Solana payment SDKs for HTTP-native, agent-friendly payment flows
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
- `FULFILLMENT_PROVIDER=karrio` — use the self-hosted Karrio adapter
- `KARRIO_API_URL=https://your-karrio-host` — self-hosted Karrio base URL
- `KARRIO_API_KEY=your-karrio-api-key` — required for production fulfillment
- `FULFILLMENT_API_URL` and `FULFILLMENT_API_KEY` — server-only provider credentials
- `FULFILLMENT_PROVIDER=mock` plus `FULFILLMENT_TEST_MODE=true` — explicit test-only mode

Shipping is priced from the configured shipping data; a real fulfillment provider account/API is still required before orders can be submitted.

## Agent payments

This project includes the Solana x402 SDK packages for building HTTP-native payment challenges alongside the existing Solana Pay checkout. The `pay` CLI can consume x402 challenges from an authorized local wallet:

```bash
npm install -g @solana/pay
pay setup
pay --sandbox curl https://your-x402-endpoint.example
```

The `pay` CLI is an operator tool and is not invoked by the Next.js server. Keep wallet authorization local and never place private keys or wallet credentials in project environment variables.

## Deploy (Vercel)

1. Import this repo
2. Set env vars from `.env.example`, including the Solana treasury and Helius RPC settings
3. Deploy
