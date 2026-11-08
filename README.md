# LendLoop 🛠️
> *Borrow what you need. Lend what you don’t.*

A privacy-first neighborhood tool-lending board featuring automated notifications, scheduled overdue reminders, and strict server-side role-based access control.

---

## 🏛️ Stack & Architecture

- **Frontend & App Framework:** [Next.js 15 (App Router)](https://nextjs.org/) + TypeScript + Tailwind CSS + Lucide Icons.
- **Authentication & Identity:** [Clerk](https://clerk.com/) with JWT integration for session verification.
- **Backend & Realtime Database:** [Convex](https://convex.dev/) (realtime subscriptions, transactional mutations, internal actions, and HTTP router).
- **Workflow Automation:** [n8n](https://n8n.io/) (self-hosted via Docker Compose) handling webhook notifications and scheduled daily overdue sweeps.

---

## 🔒 Security & Data-Minimization Decisions

1. **Server-Side RBAC Enforcement:**
   - Authorization is strictly enforced inside Convex mutations and queries, **never relying on frontend UI checks alone**.
   - Regular users can only mutate listings they own and act on borrow requests where they are either the tool owner or the borrower.
   - Admin-only capabilities (marking "Trusted Lender", removing listings globally, and viewing platform-wide active loans) require cryptographic identity checks (`requireAdmin`).

2. **Public Data Minimization:**
   - The unauthenticated public catalog endpoint (`tools:listPublicTools`) explicitly projects and strips all owner identity, descriptions, and user timestamps. Unauthenticated visitors only see the tool's name and category.
   - PII is withheld until a user signs in.

3. **Cryptographically Signed Webhooks (HMAC-SHA256):**
   - Convex dispatches asynchronous background actions with an `x-lendloop-signature` header containing an HMAC-SHA256 hash computed with a shared secret (`LENDLOOP_WEBHOOK_SECRET`).
   - The n8n workflow executes a timing-safe verification step before parsing or acting on incoming events.
   - Only minimized fields (`requestId`, `toolName`, `dates`, `targetUserId`) are sent over webhooks.

4. **Idempotent Automation Write-Backs:**
   - Overdue reminder sweeps generate deterministic idempotency keys (`reminder-<loanId>-<YYYY-MM-DD>`).
   - The Convex HTTP endpoint and mutation check `processedIdempotencyKeys` before writing activity logs or incrementing counters, preventing duplicate notifications upon network retries.

5. **Visible Failure & Error Handling:**
   - Workflows include automatic retries with backoff for HTTP nodes, coupled with a dedicated `LendLoop - Global Error Handler` workflow so failures never fail silently.

---

## 🚀 Local Setup Instructions

### 1. Prerequisites
- Node.js 18+ (tested on Node 20+)
- Docker & Docker Compose (for self-hosting n8n)
- Clerk Account & Convex Account

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/sh4reef/lendloop.git
cd lendloop
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) and Convex deployment URL.

### 4. Start Self-Hosted n8n
Run the provided Docker Compose stack:
```bash
docker compose up -d
```
Access the n8n editor at `http://localhost:5678`.

### 5. Import n8n Workflows
In the n8n UI, import the pre-configured workflow JSON files located in `./workflows`:
- `workflows/request-notification.json`
- `workflows/overdue-reminders.json`
- `workflows/error-handler.json`

Set the required environment variables in n8n (`LENDLOOP_WEBHOOK_SECRET`, `CONVEX_REMOTE_URL`, `CONVEX_INTERNAL_CRON_SECRET`).

### 6. Run Next.js & Convex Development Server
```bash
# Terminal 1: Run Convex
npx convex dev

# Terminal 2: Run Next.js
npm run dev
```
Open `http://localhost:3000` to interact with the application.

### 7. Run Automated Server-Side RBAC Audit
Run the automated test suite verifying server-enforced RBAC and data minimization across queries, mutations, and HTTP endpoints:
```bash
npm run test:rbac
```

---

## 🚢 What I Would Change to Run This in Production

If scaling LendLoop for production workloads:

1. **Infrastructure & Hosting:**
   - Deploy Next.js to Vercel or AWS ECS/Fargate behind AWS CloudFront.
   - Deploy n8n in queue mode with Redis and a PostgreSQL backend on AWS (ECS/RDS) with autoscaling workers instead of single-container SQLite.
2. **Secrets & Key Rotation:**
   - Store webhook secrets, database credentials, and Clerk keys in AWS Secrets Manager or HashiCorp Vault with automated 90-day rotation.
3. **Observability & Monitoring:**
   - Instrument the Next.js app and Convex backend with Datadog / OpenTelemetry and Sentry for distributed trace correlation and error alerts.
   - Route n8n error workflow webhooks directly into an incident management queue (e.g., PagerDuty / OpsGenie / Slack alerts).
4. **Rate Limiting & Abuse Prevention:**
   - Add Cloudflare WAF or AWS WAF rate limiting on the Convex HTTP webhooks and Clerk sign-in routes to protect against brute-force attacks and abuse.
5. **Audit Trails & Compliance:**
   - Pipe all state mutations and loan approvals into an immutable audit log bucket (AWS S3 with Object Lock or AWS CloudTrail) for full compliance verification.
