# EIDOS CRM

SaaS platform for managing trading clients: onboarding, MT5 credential collection
(personal broker + prop firm), subscriptions (card + crypto), automatic provisioning on
the external **EasierProp** platform, and a multi-level referral/commission network.

> Formerly *MatchTrading*. There is no client-side VPS and no EA licensing anymore:
> EA execution and MT5 instance management happen entirely inside EasierProp. The CRM is
> the client-acquisition and provisioning system.

## Repository layout

```
├── src/                      # Express 5 + TypeScript backend
│   ├── modules/              # auth, client, admin, subscription, broker, prop,
│   │                         # onboarding, provisioning, commission, network, notification
│   ├── integrations/         # easierprop/ (REST client), coingate/ (orders API)
│   ├── webhooks/             # stripe.webhook.ts, coingate.webhook.ts
│   ├── cron/                 # provisioning worker (1min), subscription lifecycle (daily),
│   │                         # crypto renewal emails (daily)
│   ├── middleware/           # JWT auth, roles, rate limit, security headers
│   ├── tests/                # vitest unit/integration tests
│   └── server.ts
├── frontend/                 # Next.js (App Router) + Tailwind + shadcn/ui
├── prisma/                   # schema + versioned migrations + seed
└── e2e/                      # Playwright suite (runs against staging)
```

## Getting started

```bash
# Backend
npm install
cp .env.example .env          # fill in every value (see below)
npx prisma migrate dev        # apply versioned migrations
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=change-me-12chars npm run prisma:seed
npm run dev                   # http://localhost:5000

# Frontend
cd frontend
npm install
npm run dev                   # http://localhost:3000 (NEXT_PUBLIC_API_URL points at the backend)
```

## Environment variables

See [.env.example](.env.example) for the full annotated list. Summary:

| Group | Variables |
|---|---|
| Core | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `CLIENT_URL`, `PORT` |
| Admin bootstrap (D2) | `ADMIN_EMAIL`, `ADMIN_PASSWORD` (admins are seeded, never registered) |
| Referrals (D7) | `REFERRAL_BASE_URL` (defaults to `CLIENT_URL`) |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PLAN_CATALOG` (JSON plan catalog) |
| CoinGate | `COINGATE_API_KEY`, `COINGATE_ENV` (`sandbox`\|`live`), `COINGATE_IPN_SECRET`, `CRYPTO_RENEWAL_DAYS_BEFORE` |
| EasierProp | `EASIERPROP_BASE_URL`, `EASIERPROP_ADMIN_USERNAME`, `EASIERPROP_ADMIN_PASSWORD`, `EASIERPROP_MAX_RETRY` |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` (emails are skipped when unset) |

`STRIPE_PLAN_CATALOG` example:

```json
[{"code":"STARTER","name":"Starter","stripePriceId":"price_xxx","price":99,"currency":"EUR","interval":"month","features":["..."]},
 {"code":"PRO","name":"Pro","stripePriceId":"price_yyy","price":199,"currency":"EUR","interval":"month","popular":true}]
```

## Key flows

### Onboarding (Payment → Broker → Prop → Review)
Per-step saving via `POST /api/v1/onboarding/{broker,prop}`, resumable through
`GET /api/v1/onboarding/status`. The payment step is completed by the billing
webhooks, never by a client call. MT5 credentials are stored AES-256-GCM encrypted and
are **never returned in plaintext** (admin viewing is on-demand and audit-logged).

### EasierProp provisioning
Trigger: onboarding complete **and** active subscription (either order). A node-cron
worker (every minute) drives an idempotent state machine:

```
PENDING → KEY_CREATED → PROP_ACCOUNT_CREATED → BROKER_ACCOUNT_CREATED → COMPLETED
   on error: retry with backoff 1m/5m/15m/1h/6h; 5 attempts → FAILED + admin alert
   409 (max_accounts cap) → FAILED immediately (raise cap on EasierProp, then Retry)
```

Admin actions: **Retry** (resumes from the failed step) and **Reprovision** (cleanup +
full re-run; the stored API key is never recreated). Service control (Start / Stop /
Delete) goes through the same worker queue; subscription state changes trigger
Stop/Start automatically. Credential rotation (new prop challenge, broker
replace/add, hedge-broker selection) enqueues incremental syncs.

### Payments
- **Card**: Stripe Checkout + webhooks (`/webhooks/stripe`, raw-body signature verification).
  Invoice list and Customer Portal are exposed to the client.
- **Crypto**: CoinGate orders with instant fiat settlement. IPN callbacks
  (`/webhooks/coingate`) are verified with a per-order token; forged IPNs are rejected
  and audited. Crypto has no recurring charge: a daily cron emails a renewal link
  before expiry; non-payment → 7-day grace → suspension.

### Commissions
Admin-configurable plan (N levels, rate per level). On every confirmed payment the
engine walks the payer's upline and creates one commission per ancestor - idempotent
per payment reference. Refunds reverse the linked commissions (paid ones carry over as
negative balance). Payouts are manual: create a period batch → export CSV
(agent, IBAN/reference, total) → pay by bank transfer → mark paid.

## API overview

`GET /api/info` lists the mounted routers. Highlights:

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/{register,login,forgot-password,verify-otp,reset-password}` |
| Onboarding | `GET /api/v1/onboarding/status`, `POST /api/v1/onboarding/{broker,prop}` |
| Subscriptions | `GET /plans`, `POST /checkout` (card/crypto), `GET /current`, `GET /invoices`, `POST /portal`, `GET /crypto-orders/:id`, `POST /cancel`, `POST /reactivate` (under `/api/subscriptions`) |
| Provisioning | `GET /api/provisioning/status` (client) · `/api/admin/provisioning[...]` list/detail/retry/reprovision · `/api/admin/service/:userId/{start,stop,delete,status}` |
| Broker lifecycle | `POST /api/broker` (add), `POST /api/broker/:id/replace`, `POST /api/broker/hedge-broker` |
| Prop lifecycle | `POST /api/prop` (new challenge / FUNDED rotation, archives the old account) |
| Commissions | `GET /api/network/commissions`, `GET /api/network/downline-clients` · admin: `/api/admin/commissions` (report), `/plan`, `/payout-batch[...]` |
| Credentials | `POST /api/admin/users/:userId/credentials/:type/:accountId/reveal` (audited) |

New endpoints use the uniform error shape `{ success: false, error: { code, message } }`.

## Testing

```bash
npm test                # vitest: commission engine, provisioning state machine,
                        # subscription transitions, CoinGate IPN (31 tests)

cd e2e && npm install && npm run install-browsers
E2E_BASE_URL=https://staging.example.com E2E_REF_CODE=ABC123 npm test
```

The Playwright suite covers sign-up with referral → onboarding (per-step saving,
resume, masked credentials) and checkout on both providers (Stripe test mode with
`E2E_STRIPE=1`, CoinGate sandbox with `E2E_COINGATE=1`), across Chromium/Firefox/
WebKit and a mobile viewport (cross-browser QA).

## Deployment

- **Backend**: Railway ([railway.toml](railway.toml)) - `prisma migrate deploy` runs on
  every deploy before the server starts. Set all env vars in the Railway environment;
  configure the Stripe webhook to `https://<backend>/webhooks/stripe` and the CoinGate
  IPN to `https://<backend>/webhooks/coingate`. Use separate staging and production
  environments with separate databases and API keys (Stripe test / CoinGate sandbox on staging).
- **Frontend**: Vercel or Railway - set `NEXT_PUBLIC_API_URL` to the backend URL.
- **Admin**: seeded via `npm run prisma:seed` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Security notes

- MT5 passwords and EasierProp API keys: AES-256-GCM at rest (`ENCRYPTION_KEY`),
  masked in every API response; admin reveal is on-demand and writes a HIGH-severity
  audit event.
- Webhooks: Stripe signature verification (raw body) and CoinGate per-order token check.
- No credentials of any kind live in this repository - everything comes from env.
