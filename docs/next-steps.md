Next steps for implementing payments, printing, and UK shipping

- Implement server-side Solana mainnet USDC payment verification
  - Verify the transaction is for the USDC SPL token mint (do not treat native SOL transfers as USDC).
  - Verify the recipient wallet (treasury) and expected amount match the order.
  - Confirm transaction success and sufficient confirmations (commitment/finality) before marking payment complete.
  - Record the verified transaction signature and metadata (amount, mint, recipient, block time) in the shipment/order record.

- Integrate the A&A Card Printing API securely
  - Create a server-side adapter that authenticates with the A&A API using secrets stored in environment variables or GitHub secrets.
  - Only create a print order after payment is successfully verified.
  - Use idempotency keys to prevent duplicate orders and store provider order IDs in the database.
  - Handle and expose provider errors and retries; update fulfillment_status and provider_order_id atomically.

- Implement UK shipping address collection and validation
  - Collect recipient name, address lines, town/city, postcode, email, and optional telephone number.
  - Validate required fields before submitting orders to A&A (postcode format, non-empty name/address lines, valid email).
  - Ensure shipping rates calculation and fulfilment address mapping support UK addresses and regional shipping services.

Important notes

- Do NOT add these tasks as TODO comments in the workflow file.
- Do NOT claim that payment verification, A&A printing, or UK shipping are implemented until the actual application code and automated tests confirm the features.

Suggested environment variables and configuration to review

- Database: PRISMA_DATABASE_URL_2, PRISMA_DATABASE_URL, POSTGRES_URL, DATABASE_URL
- Supabase: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- Solana / Helius: HELIUS_API, HELIUS_RPC, SOLANA_TREASURY (or equivalent treasury address)
- Fulfillment provider / A&A: FULFILLMENT_PROVIDER, FULFILLMENT_API_URL, FULFILLMENT_API_KEY, PRODIGI_API (if used), FULFILLMENT_TEST_MODE
- Stripe: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL (for redirect URLs)
- Pricing/markups: SHIPPING_MARKUP_CENTS, FULFILLMENT_MARKUP_CENTS, CARD_PRICE_CENTS
- General: NODE_ENV

Testing and deployment notes

- Ensure idempotency keys are generated and persisted with the shipment order before initiating payments.
- Add end-to-end tests (or integration tests) that simulate a successful USDC transfer on Solana (mock Helius/rpc responses) and verify that a provider order is created only after verification.
- Configure GitHub Actions secrets for the production credentials and verify builds in a staging environment before enabling production workflows.
