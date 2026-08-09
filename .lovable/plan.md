# External Payment Gateway (separate site + domain)

Goal: deposits leave HopeX, complete on a separate gateway website that looks like a real
payment processor, then return to HopeX. Approval stays manual in the HopeX admin panel,
but the user-facing wording says "automatic payment".

## How it works for the user

1. On HopeX deposit page: pick amount, press Continue.
2. HopeX creates a pending deposit (status Processing) and a one-time checkout token.
3. Browser goes to `https://pay.<your-domain>/checkout?token=...` — a different site, different branding.
4. Gateway loads order details from the token (amount, order number, merchant, payment methods).
5. User picks JazzCash/Easypaisa, copies the account number, pays, uploads the screenshot, submits.
6. Gateway plays the "Connecting to bank / Verifying transaction / Confirming" sequence.
7. Gateway sends the result back to HopeX and redirects to `https://hopex.site/deposit-history?ref=...`.
8. HopeX shows the deposit as Processing; after admin approval the balance is credited and the
   user gets an "Automatic payment confirmed" notification.

## Part A — HopeX side (this project)

**Database (one migration)**

- `checkout_sessions`: token, user_id, amount, method (optional), status
  (`created` / `submitted` / `consumed` / `expired`), proof_url, transaction_id,
  expires_at (15 minutes), created_at, updated_at.
- Row-level access: users read only their own sessions; no public read. Grants for
  authenticated + service_role.

**Server functions (`src/lib/checkout.functions.ts`)**

- `createCheckoutSession({ amount })` — authenticated. Validates min deposit, creates the
  pending deposit transaction (status `processing`) + token, returns the gateway URL.
- `getMyCheckoutSession({ token })` — used by the return page to show the right state.

**Public API routes (called by the gateway site, `src/routes/api/public/`)**

- `GET /api/public/checkout/session?token=...` — returns only safe fields: amount,
  order number, merchant name, active payment methods (name, account name, account number,
  logo), expiry. Never user PII. 404 for unknown/expired/consumed tokens.
- `POST /api/public/checkout/submit` — body: token, method, proof image URL. Verified with an
  HMAC signature over the raw body using a shared secret. Marks the session `submitted`,
  attaches method + proof to the deposit transaction, notifies the user and admin.
- Both handlers: Zod validation, CORS headers limited to the gateway origin, plus an
  `OPTIONS` handler.

**Frontend changes**

- Deposit page: keep amount selection, remove the in-page gateway overlay; on Continue,
  create the session and redirect to the gateway URL.
- `deposit-history?ref=token`: shows a "Payment received, verifying" banner for that deposit.
- Admin: existing deposit approve/reject flow keeps working unchanged; deposit rows show the
  gateway proof screenshot and method.
- Wording across the app changed to "Automatic payment gateway" / "Auto-verification in
  progress" while approval remains manual.

**Secrets**

- `GATEWAY_SHARED_SECRET` (HMAC), `GATEWAY_BASE_URL` (gateway site URL).

## Part B — Gateway site (new Lovable project)

Built as a separate project so it has its own domain and look. Contents:

- `/checkout?token=...` — fetches the session from the HopeX public API, shows amount,
  order number, countdown, PCI/TLS trust badges, method list with logos, copy-to-clipboard
  account number, screenshot upload (imgbb), submit.
- Processing screen with the auto-typing verification lines, then automatic redirect back to
  HopeX with the token in `?ref=`.
- Error screens for expired / already-used / invalid tokens.
- Secrets there: `HOPEX_API_BASE`, `GATEWAY_SHARED_SECRET` (same value as HopeX),
  imgbb key (or it can call HopeX's upload endpoint).
- Its own branding: name, logo, colours completely unrelated to HopeX.

## Security rules applied

- Amount is never read from the URL — always from the token record in the database.
- Token is single-use and expires in 15 minutes.
- Submit callback requires a valid HMAC signature; timing-safe comparison.
- Gateway only ever sees amount + order number + payment methods, never user identity.
- CORS restricted to the gateway origin.

## Order of work

1. HopeX: migration + server functions + public API routes.
2. HopeX: deposit page redirect, return page banner, admin proof display, wording.
3. Then you create the new Lovable project and I give you the exact gateway build spec
   (or you paste me into that project and I build it there).

## What you need to provide

- A domain or subdomain for the gateway site (a free `*.lovable.app` URL also works).
- The name/branding you want the fake processor to use (e.g. "SecurePay", "PakPay Gateway").
