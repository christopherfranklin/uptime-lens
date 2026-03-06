# Phase 1: Project Foundation - Research

**Researched:** 2026-03-06
**Domain:** Next.js 16 scaffolding, Drizzle ORM + Neon Postgres schema design, Resend email infrastructure, shadcn/ui + Tailwind v4 landing page, Vercel + Railway deployment
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire technical foundation for Uptime Lens: a Next.js 16 application with Turbopack, a complete Postgres database schema (including rollup tables for data retention), email infrastructure via Resend with proper DNS authentication, a Stripe-inspired marketing landing page, and deployment across Vercel (web) + Railway (worker placeholder) + Neon (database).

This is a greenfield project with no existing code. The stack is well-documented and the integration paths are well-trodden. Next.js 16 + Drizzle ORM + Neon is a standard combination with first-party documentation from all three projects. The primary risk areas are (1) getting the database schema right on the first pass since all future phases depend on it, and (2) ensuring email deliverability is configured correctly from day one since magic link auth and alerting both depend on it.

**Primary recommendation:** Use `create-next-app` with default settings (TypeScript, Tailwind v4, App Router, Turbopack, Biome), add Drizzle ORM with the Neon HTTP driver, define the complete schema with rollup tables before writing any feature code, and verify Resend email delivery with a test send before moving to Phase 2.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Domain: uptimelens.io (needs to be purchased)
- Alert emails from: alerts@uptimelens.io
- Magic link emails: same domain, Claude's discretion on sender address
- SPF/DKIM/DMARC must be configured on uptimelens.io before email sends
- Include a simple marketing/landing page in Phase 1
- Lead messaging: price comparison angle -- "$5/mo vs $34/mo" (UptimeRobot comparison)
- Sections: hero, features overview, pricing, CTA to sign up
- Two pricing tiers: $5/mo (10 monitors), $9/mo (30 monitors)
- Free trial mentioned on pricing -- details in Phase 7
- Full deployment in Phase 1: Vercel (web app) + Railway (worker) + Neon (production Postgres)
- Phase 1 delivers a live URL, not just local dev
- Product name: "Uptime Lens" (locked in, final)
- Color palette: green/teal direction -- uptime = green, trust, reliability
- Visual style: Stripe-inspired -- polished gradients, premium feel, clean typography
- UI framework: shadcn/ui with Tailwind CSS (from research stack recommendation)

### Claude's Discretion
- Database schema structure (table names, column types, index strategy)
- Rollup table design (raw -> hourly -> daily aggregation approach)
- Project file/folder organization
- Magic link sender address (e.g., login@uptimelens.io or noreply@uptimelens.io)
- Landing page exact layout and copy beyond the messaging angle
- Tailwind color palette specifics within the green/teal direction
- Railway worker scaffold (placeholder until Phase 4 check engine)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

This is an infrastructure phase with no mapped requirement IDs. It enables all subsequent requirements:

| ID | Description | Research Support |
|----|-------------|-----------------|
| (none) | Infrastructure phase | All findings below establish the foundation that AUTH-01 through BILL-04 depend on |

**Success Criteria mapping:**
| Criterion | Research Support |
|-----------|-----------------|
| SC-1: Next.js starts locally with Turbopack, connects to Neon | Standard Stack (Next.js 16, Drizzle + Neon HTTP driver) |
| SC-2: All database tables exist with proper indexes/FKs | Architecture Patterns (complete schema design) |
| SC-3: Drizzle ORM configured with typed schema, migrations run | Standard Stack (Drizzle), Code Examples (schema patterns) |
| SC-4: Resend email verified with test send, SPF/DKIM/DMARC configured | Standard Stack (Resend), Code Examples (email sending) |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.x (latest stable, 16.1.6 as of docs) | Full-stack framework | Turbopack is default bundler, App Router, React 19.2 built-in. `create-next-app` sets up TypeScript + Tailwind + Turbopack with `--yes` flag. |
| React | 19.2 (bundled with Next.js 16) | UI library | Shipped with Next.js 16. View Transitions, Activity component. |
| TypeScript | 5.x (min 5.1.0) | Type safety | Required by Next.js 16 |
| Tailwind CSS | 4.2.x | Styling | v4 uses CSS-based `@theme` directives instead of JS config. 5x faster full builds. |
| Drizzle ORM | 0.45.x | Database ORM | Code-first TypeScript schemas, zero dependencies, optimized for Neon serverless. |
| drizzle-kit | latest | Migrations CLI | `drizzle-kit push` for dev, `drizzle-kit generate` + `drizzle-kit migrate` for production. |
| @neondatabase/serverless | latest | Neon driver | HTTP driver for serverless, WebSocket driver for sessions. |
| Resend | latest SDK | Transactional email | Developer-first API, React Email integration, 3K emails/month free tier. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | latest (CLI) | Component library | All UI components. Supports Tailwind v4 + React 19. Uses `tw-animate-css` instead of deprecated `tailwindcss-animate`. |
| @biomejs/biome | latest | Linting + formatting | Next.js 16 offers Biome as first-class alternative to ESLint. Single tool replaces ESLint + Prettier. |
| dotenv | latest | Environment variables | Loading `.env` files for local development and drizzle-kit scripts. |
| react-email | latest | Email templates | JSX-based email templates for magic link and alert emails. First-party Resend integration. |
| @react-email/components | latest | Email primitives | Pre-built email components (Html, Head, Body, Text, Link, etc.) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Biome | ESLint 9 flat config | ESLint has more rules but requires Prettier separately. Next.js 16 supports both natively. Biome is simpler for a new project. |
| Drizzle `push` | Drizzle `generate` + `migrate` | `push` is faster for dev. For production, use `generate` + `migrate` for auditable SQL files. Use `push` initially, switch to `generate`/`migrate` before production deployment. |
| Neon HTTP driver | Neon WebSocket driver | HTTP is faster for individual queries (no connection overhead). WebSocket needed for interactive transactions. Use HTTP for the web app (serverless), WebSocket if needed for the worker later. |

**Installation:**
```bash
# Create Next.js app (TypeScript, Tailwind, App Router, Turbopack, Biome)
npx create-next-app@latest uptime-lens --yes
# When prompted for "customize settings", select Biome as linter

# Database (ORM + Neon driver)
npm install drizzle-orm @neondatabase/serverless dotenv
npm install -D drizzle-kit

# Email
npm install resend @react-email/components react-email

# UI components (shadcn CLI)
npx shadcn@latest init

# Dev tools
npm install -D @biomejs/biome
```

## Architecture Patterns

### Recommended Project Structure

```
uptime-lens/
├── app/                      # Next.js App Router pages
│   ├── (marketing)/          # Landing page route group (no layout nesting)
│   │   └── page.tsx          # Landing/marketing page at /
│   ├── (auth)/               # Auth routes (Phase 2)
│   ├── (dashboard)/          # Dashboard routes (Phase 3+)
│   ├── api/                  # API routes
│   │   ├── auth/             # Auth endpoints (Phase 2)
│   │   ├── webhooks/         # Stripe webhooks (Phase 7)
│   │   └── email/            # Email test endpoint (Phase 1)
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Tailwind + theme config
├── components/               # React UI components
│   ├── ui/                   # shadcn/ui components (auto-generated)
│   ├── landing/              # Landing page sections
│   └── layout/               # Shell, nav, footer
├── lib/                      # Shared utilities
│   ├── db/                   # Database layer
│   │   ├── schema.ts         # Drizzle schema (all tables)
│   │   ├── index.ts          # Database client instance
│   │   └── migrations/       # Generated SQL migrations
│   ├── email/                # Email sending utilities
│   │   ├── resend.ts         # Resend client instance
│   │   └── templates/        # React Email templates
│   └── utils.ts              # General utilities (cn helper from shadcn)
├── worker/                   # Railway worker (placeholder for Phase 4)
│   ├── package.json          # Separate package for worker
│   └── src/
│       └── index.ts          # Worker entry point (placeholder)
├── drizzle/                  # Generated migration files
├── drizzle.config.ts         # Drizzle Kit configuration
├── biome.json                # Biome linter/formatter config
├── .env.local                # Local environment variables (gitignored)
├── .env.example              # Environment variable template (committed)
└── next.config.ts            # Next.js configuration
```

### Pattern 1: Drizzle Schema Organization (Single File)

**What:** Define all database tables in a single `lib/db/schema.ts` file for Phase 1 since the schema is the core deliverable and cross-table references (foreign keys) are simpler in one file.

**When to use:** Initial schema definition with <15 tables. Split into per-domain files (schema/users.ts, schema/monitors.ts) if the file grows beyond ~300 lines.

**Example:**
```typescript
// lib/db/schema.ts
import {
  pgTable, pgEnum,
  integer, text, varchar, boolean, timestamp,
  real, bigint, index, uniqueIndex,
} from "drizzle-orm/pg-core";

// Enums
export const monitorTypeEnum = pgEnum("monitor_type", ["http", "tcp", "ssl"]);
export const monitorStatusEnum = pgEnum("monitor_status", ["active", "paused"]);
export const incidentStatusEnum = pgEnum("incident_status", ["ongoing", "resolved"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing", "active", "past_due", "canceled", "unpaid"
]);

// Users
export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Monitors
export const monitors = pgTable("monitors", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar({ length: 255 }).notNull(),
  url: text().notNull(),
  type: monitorTypeEnum().notNull().default("http"),
  status: monitorStatusEnum().notNull().default("active"),
  expectedStatusCode: integer("expected_status_code").default(200),
  checkIntervalSeconds: integer("check_interval_seconds").notNull().default(180),
  timeoutMs: integer("timeout_ms").notNull().default(10000),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("monitors_user_id_idx").on(table.userId),
  index("monitors_status_idx").on(table.status),
]);
```

### Pattern 2: Rollup Table Design (Raw -> Hourly -> Daily)

**What:** Three-tier storage strategy: raw heartbeats (kept 48h), hourly rollups (kept 90 days), daily rollups (kept indefinitely). Designed from day one per Pitfall #3.

**When to use:** Always. The schema must include rollup tables even though the rollup jobs are built in Phase 8. The tables must exist so that dashboard queries (Phase 6) can be written against them.

**Example:**
```typescript
// Raw check results (retained 48 hours)
export const heartbeats = pgTable("heartbeats", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  monitorId: integer("monitor_id").notNull().references(() => monitors.id, { onDelete: "cascade" }),
  status: integer().notNull(),        // HTTP status code or 0 for TCP/SSL success, -1 for error
  responseTimeMs: real("response_time_ms"),
  statusCode: integer("status_code"), // HTTP status code (null for TCP/SSL)
  error: text(),
  sslExpiresAt: timestamp("ssl_expires_at", { withTimezone: true }),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("heartbeats_monitor_checked_idx").on(table.monitorId, table.checkedAt),
  index("heartbeats_checked_at_idx").on(table.checkedAt), // For cleanup job
]);

// Hourly aggregations (retained 90 days)
export const heartbeatsHourly = pgTable("heartbeats_hourly", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  monitorId: integer("monitor_id").notNull().references(() => monitors.id, { onDelete: "cascade" }),
  hour: timestamp({ withTimezone: true }).notNull(),      // Truncated to hour
  totalChecks: integer("total_checks").notNull().default(0),
  successfulChecks: integer("successful_checks").notNull().default(0),
  avgResponseTimeMs: real("avg_response_time_ms"),
  minResponseTimeMs: real("min_response_time_ms"),
  maxResponseTimeMs: real("max_response_time_ms"),
}, (table) => [
  uniqueIndex("heartbeats_hourly_monitor_hour_idx").on(table.monitorId, table.hour),
]);

// Daily aggregations (retained indefinitely)
export const heartbeatsDaily = pgTable("heartbeats_daily", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  monitorId: integer("monitor_id").notNull().references(() => monitors.id, { onDelete: "cascade" }),
  date: timestamp({ withTimezone: true }).notNull(),      // Truncated to day
  totalChecks: integer("total_checks").notNull().default(0),
  successfulChecks: integer("successful_checks").notNull().default(0),
  avgResponseTimeMs: real("avg_response_time_ms"),
  minResponseTimeMs: real("min_response_time_ms"),
  maxResponseTimeMs: real("max_response_time_ms"),
  uptimePercentage: real("uptime_percentage"),
}, (table) => [
  uniqueIndex("heartbeats_daily_monitor_date_idx").on(table.monitorId, table.date),
]);
```

### Pattern 3: Tailwind v4 Theme with Green/Teal Brand Colors

**What:** Define the brand color palette using CSS `@theme` directives in `globals.css` instead of a JS config file (Tailwind v4 pattern).

**Example:**
```css
/* app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

@theme {
  /* Brand colors - green/teal direction */
  --color-brand-50: oklch(0.97 0.02 165);
  --color-brand-100: oklch(0.94 0.04 165);
  --color-brand-200: oklch(0.88 0.08 165);
  --color-brand-300: oklch(0.80 0.12 165);
  --color-brand-400: oklch(0.72 0.14 165);
  --color-brand-500: oklch(0.62 0.16 165);
  --color-brand-600: oklch(0.52 0.14 165);
  --color-brand-700: oklch(0.42 0.12 165);
  --color-brand-800: oklch(0.34 0.10 165);
  --color-brand-900: oklch(0.26 0.06 165);
  --color-brand-950: oklch(0.18 0.04 165);
}
```

This generates utilities like `bg-brand-500`, `text-brand-700`, `border-brand-200` etc. OKLCH provides more vibrant, perceptually uniform colors than RGB/HSL.

### Pattern 4: Drizzle Database Client Instance

**What:** Create a singleton database client that can be imported across the app.

**Example:**
```typescript
// lib/db/index.ts
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export const db = drizzle(process.env.DATABASE_URL!, { schema });
```

### Pattern 5: Resend Email Client

**What:** Create a singleton Resend client for email sending.

**Example:**
```typescript
// lib/email/resend.ts
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
```

### Anti-Patterns to Avoid

- **Do NOT use Tailwind v3 syntax (tailwind.config.js/ts).** Tailwind v4 uses CSS `@theme` directives. The JS config file does not exist in v4 projects.
- **Do NOT use `tailwindcss-animate`.** It is deprecated in favor of `tw-animate-css` for Tailwind v4 + shadcn/ui.
- **Do NOT use `serial()` for primary keys.** PostgreSQL recommends `integer().generatedAlwaysAsIdentity()` over `serial()`. Drizzle supports this pattern natively.
- **Do NOT store raw heartbeat data indefinitely.** Design rollup tables from day one (even if rollup jobs are built in Phase 8).
- **Do NOT create separate databases for dev/prod in the same Neon project.** Use separate Neon projects or branches. Neon free tier allows 100 projects.
- **Do NOT use `drizzle-kit push` for production deployments.** Use `drizzle-kit generate` + `drizzle-kit migrate` for auditable, reversible migrations. Use `push` only during rapid development.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UI component library | Custom buttons, inputs, dialogs | shadcn/ui CLI (`npx shadcn@latest add button`) | Pre-built Radix + Tailwind components with accessibility baked in |
| Email HTML rendering | Raw HTML email templates | React Email + @react-email/components | Cross-client HTML is extremely fragile; React Email handles it |
| Database migrations | Custom SQL scripts | drizzle-kit generate/migrate | Tracks migration history, generates typed schemas, handles rollback |
| Color palette generation | Manual hex/rgb values | OKLCH color space in @theme | Perceptually uniform, more vibrant than RGB, standard in Tailwind v4 |
| Form validation | Custom validation logic | Zod (comes with shadcn/ui forms) | Type-safe runtime validation that integrates with TypeScript |
| CSS class merging | Manual string concatenation | `cn()` utility from shadcn/ui (clsx + tailwind-merge) | Correctly handles Tailwind class conflicts |

**Key insight:** Phase 1 is infrastructure. Every piece should be a standard tool, not custom code. The custom code comes in Phase 2+.

## Common Pitfalls

### Pitfall 1: Tailwind v4 Configuration Confusion

**What goes wrong:** Copying Tailwind v3 examples and creating a `tailwind.config.js` file. In v4, configuration is CSS-based via `@theme` directives.
**Why it happens:** Most tutorials and examples online still reference v3 syntax.
**How to avoid:** Only reference the official Tailwind v4 docs. Use `@theme` in `globals.css` for all customization. The shadcn/ui Tailwind v4 guide documents the correct approach.
**Warning signs:** Getting "unknown at rule @theme" errors, or theme values not being applied.

### Pitfall 2: Drizzle Schema Column Naming

**What goes wrong:** Using camelCase in TypeScript but expecting snake_case in PostgreSQL. Drizzle uses the TypeScript key name as the column name by default.
**Why it happens:** Convention mismatch between TypeScript (camelCase) and PostgreSQL (snake_case).
**How to avoid:** Always provide explicit column names: `userId: integer("user_id")`. This creates a `user_id` column in Postgres while keeping `userId` in TypeScript.
**Warning signs:** Columns named `userId` instead of `user_id` in the database.

### Pitfall 3: Missing Database Indexes on Foreign Keys

**What goes wrong:** Foreign keys are declared but not indexed. PostgreSQL does NOT automatically index foreign key columns.
**Why it happens:** Developers assume foreign keys imply indexes (they do in some databases, but not PostgreSQL).
**How to avoid:** Add explicit indexes on every foreign key column used in WHERE clauses or JOINs. The schema examples above include these.
**Warning signs:** Slow queries when filtering by `monitor_id` or `user_id` on tables with many rows.

### Pitfall 4: Neon Connection String Format

**What goes wrong:** Using the wrong connection string format for the Neon driver.
**Why it happens:** Neon provides multiple connection string formats (pooled vs direct, with and without options).
**How to avoid:** Use the connection string from the Neon dashboard. For the HTTP driver (`drizzle-orm/neon-http`), use the standard `postgresql://` URL. For WebSocket driver, add `?sslmode=require` if not present. Always use the pooled connection string for production.
**Warning signs:** Connection refused errors, SSL handshake failures.

### Pitfall 5: Resend Domain Not Verified Before Sending

**What goes wrong:** Attempting to send emails from `alerts@uptimelens.io` before DNS records are propagated. Emails fail silently or go to spam.
**Why it happens:** DNS propagation takes 24-72 hours. SPF/DKIM/DMARC records must be verified by Resend before the domain can be used.
**How to avoid:** Add the domain to Resend immediately. Use `onboarding@resend.dev` for development testing while waiting for DNS propagation. Only switch to the production domain after Resend confirms verification.
**Warning signs:** Resend dashboard showing domain status as "Pending". Emails returning errors or not being delivered.

### Pitfall 6: Forgetting .env.local for Next.js Environment Variables

**What goes wrong:** Putting secrets in `.env` instead of `.env.local`. Next.js loads `.env.local` for local development and it is gitignored by default. `.env` is committed to git.
**Why it happens:** Different frameworks handle `.env` files differently.
**How to avoid:** Use `.env.local` for all secrets (DATABASE_URL, RESEND_API_KEY). Create `.env.example` with placeholder values for documentation. Add `.env.local` to `.gitignore`.
**Warning signs:** Secrets appearing in git history, environment variables not loading in development.

## Code Examples

Verified patterns from official sources:

### Drizzle Config File
```typescript
// drizzle.config.ts
// Source: https://orm.drizzle.team/docs/get-started/neon-new
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Database Client Initialization
```typescript
// lib/db/index.ts
// Source: https://orm.drizzle.team/docs/connect-neon
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export const db = drizzle(process.env.DATABASE_URL!, { schema });

// Re-export schema for convenience
export * from "./schema";
```

### Resend Email Sending (API Route)
```typescript
// app/api/email/test/route.ts
// Source: https://resend.com/docs/send-with-nextjs
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  try {
    const { data, error } = await resend.emails.send({
      from: "Uptime Lens <alerts@uptimelens.io>",
      to: ["test@example.com"],
      subject: "Test email from Uptime Lens",
      html: "<p>If you received this, email infrastructure is working.</p>",
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json({ success: true, id: data?.id });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
```

### shadcn/ui Initialization
```bash
# Source: https://ui.shadcn.com/docs/installation/next
npx shadcn@latest init

# Add specific components as needed
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add badge
```

### Biome Configuration
```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/latest/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": true,
    "ignore": [
      "node_modules",
      ".next",
      "drizzle"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

### Environment Variables Template
```bash
# .env.example
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
RESEND_API_KEY=re_xxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Complete Incidents Table Schema
```typescript
// Part of lib/db/schema.ts
export const incidents = pgTable("incidents", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  monitorId: integer("monitor_id").notNull().references(() => monitors.id, { onDelete: "cascade" }),
  status: incidentStatusEnum().notNull().default("ongoing"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  cause: text(),                           // Error message from failed check
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
}, (table) => [
  index("incidents_monitor_id_idx").on(table.monitorId),
  index("incidents_status_idx").on(table.status),
  index("incidents_started_at_idx").on(table.startedAt),
]);
```

### Complete Subscriptions Table Schema
```typescript
// Part of lib/db/schema.ts
export const subscriptions = pgTable("subscriptions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  status: subscriptionStatusEnum().notNull().default("trialing"),
  planMonitorLimit: integer("plan_monitor_limit").notNull().default(10),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("subscriptions_user_id_idx").on(table.userId),
  uniqueIndex("subscriptions_stripe_customer_id_idx").on(table.stripeCustomerId),
  uniqueIndex("subscriptions_stripe_subscription_id_idx").on(table.stripeSubscriptionId),
]);
```

### Magic Link Sender Address Recommendation
```
login@uptimelens.io  -- for magic link / auth emails
alerts@uptimelens.io -- for downtime/recovery/SSL alerts (locked by user)
```

Using `login@` rather than `noreply@` makes the sender recognizable and avoids spam filter red flags. The word "login" in the sender makes it clear this is an expected authentication email.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js (JS config) | CSS @theme directives | Tailwind v4 (Jan 2026) | No JS config file. All theme in globals.css. |
| tailwindcss-animate | tw-animate-css | Tailwind v4 + shadcn/ui | Import `tw-animate-css` instead of the old package |
| ESLint + Prettier (two tools) | Biome (one tool) | Next.js 16 (Oct 2025) | Next.js 16 offers Biome as first-class linter option in create-next-app |
| `next lint` in next build | Linter runs separately via scripts | Next.js 16 (Oct 2025) | `next build` no longer runs linter. Add lint script to package.json. |
| serial() for PKs | integer().generatedAlwaysAsIdentity() | PostgreSQL 10+ / Drizzle ORM | Identity columns are the modern Postgres standard. Drizzle supports natively. |
| Auth.js / NextAuth v5 | Better Auth 1.4.x | Sept 2025 | Auth.js team joined Better Auth. Better Auth is the recommended path for new projects. |
| Webpack bundler | Turbopack (default) | Next.js 16 (Oct 2025) | Turbopack is stable for both dev and prod. No webpack config needed. |
| experimental.turbopack config | top-level turbopack config | Next.js 16 (Oct 2025) | Turbopack config moved out of experimental namespace |

**Deprecated/outdated:**
- `tailwind.config.js` / `tailwind.config.ts`: Does not exist in Tailwind v4 projects
- `tailwindcss-animate`: Replaced by `tw-animate-css`
- `next lint`: Removed from `next build` in Next.js 16
- `serial()` in Drizzle: Use `integer().generatedAlwaysAsIdentity()` instead

## Open Questions

1. **Neon branch strategy for dev vs production**
   - What we know: Neon supports database branching (like git branches for databases). Free tier allows 100 projects.
   - What's unclear: Whether to use separate projects or branches within one project for dev/staging/prod.
   - Recommendation: Use separate Neon projects for dev and production. Simpler isolation, avoids accidental production writes during development. Free tier supports this.

2. **Railway worker scaffold scope**
   - What we know: Railway needs a deployable service. Phase 4 will build the actual check engine with BullMQ.
   - What's unclear: How minimal the worker placeholder should be.
   - Recommendation: Create a minimal Node.js process with a health check endpoint and a `package.json`. It should connect to the database to verify connectivity. No BullMQ or Redis yet -- that is Phase 4 scope.

3. **shadcn/ui component selection for landing page**
   - What we know: Landing page needs hero, features, pricing, CTA sections.
   - What's unclear: Which specific shadcn/ui components to install for the landing page.
   - Recommendation: Start with `button`, `card`, `badge`, and `separator`. These cover pricing cards, feature cards, and CTA buttons. Add more as needed.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (latest) + @testing-library/react |
| Config file | vitest.config.mts (Wave 0 -- does not exist yet) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map

Phase 1 is infrastructure with no functional requirements. Tests validate that infrastructure is correctly configured:

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-1 | Next.js starts locally, connects to Neon | smoke | `npm run dev` (manual verification) | N/A |
| SC-2 | All database tables exist with indexes/FKs | integration | `npx drizzle-kit push --dry-run` or migration check | Wave 0 |
| SC-3 | Drizzle schema is typed and migrations run | unit | `npx vitest run tests/db/schema.test.ts -x` | Wave 0 |
| SC-4 | Resend email test send works | integration | `npx vitest run tests/email/resend.test.ts -x` (requires API key) | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + manual verification of dev server + Neon connection + email test send

### Wave 0 Gaps
- [ ] `vitest.config.mts` -- Vitest configuration with @vitejs/plugin-react, jsdom environment, tsconfigPaths
- [ ] Install: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`
- [ ] `tests/db/schema.test.ts` -- validates schema can be imported and has expected table exports
- [ ] `tests/email/resend.test.ts` -- validates Resend client initialization (mock API key for CI)

## Sources

### Primary (HIGH confidence)
- [Next.js 16 Installation Guide](https://nextjs.org/docs/app/getting-started/installation) -- create-next-app defaults, Turbopack config, linter options, project structure
- [Next.js 16 Release Blog](https://nextjs.org/blog/next-16) -- Turbopack stability, new defaults, breaking changes
- [Drizzle ORM + Neon Setup](https://orm.drizzle.team/docs/get-started/neon-new) -- Installation, configuration, schema, migrations
- [Drizzle ORM Schema Declaration](https://orm.drizzle.team/docs/sql-schema-declaration) -- pgTable, column types, indexes, foreign keys, enums
- [Drizzle ORM PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) -- All PG types: timestamp, real, bigint, json/jsonb, uuid
- [Drizzle ORM Neon Connection](https://orm.drizzle.team/docs/connect-neon) -- HTTP vs WebSocket drivers
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations) -- push, generate, migrate commands
- [Resend: Send with Next.js](https://resend.com/docs/send-with-nextjs) -- API route and Server Action approaches
- [Resend: DMARC Implementation](https://resend.com/docs/dashboard/domains/dmarc) -- SPF/DKIM/DMARC setup
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) -- Tailwind v4 + React 19 setup
- [shadcn/ui Tailwind v4 Guide](https://ui.shadcn.com/docs/tailwind-v4) -- tw-animate-css migration, CSS variable changes
- [Tailwind CSS Theme Variables](https://tailwindcss.com/docs/theme) -- @theme directive, custom colors
- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors) -- OKLCH, custom palettes, --color-* namespace
- [Neon: Connect from Drizzle](https://neon.com/docs/guides/drizzle) -- Official Neon + Drizzle guide
- [Neon Pricing](https://neon.com/pricing) -- Free tier: 100 projects, 100 CU-hours, 0.5 GB storage
- [Next.js Vitest Testing Guide](https://nextjs.org/docs/app/guides/testing/vitest) -- Official Vitest setup for Next.js 16

### Secondary (MEDIUM confidence)
- [Resend SPF/DKIM/DMARC Guide](https://dmarcdkim.com/setup/how-to-setup-resend-spf-dkim-and-dmarc-records) -- Step-by-step DNS record setup
- [Neon Free Tier Breakdown](https://vela.simplyblock.io/articles/neon-serverless-postgres-pricing-2026/) -- 2026 pricing details post-Databricks acquisition
- [Railway Node.js Deployment](https://railway.com/deploy/nodejs) -- Auto-detection, process management
- [Biome with Next.js](https://www.timsanteford.com/posts/how-to-use-biome-with-next-js-for-linting-and-formatting/) -- Configuration and setup guide

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries are documented with official guides for this exact combination
- Architecture: HIGH -- schema design follows established Drizzle patterns; rollup strategy from project research
- Pitfalls: HIGH -- Tailwind v4 migration and Drizzle naming are well-documented; email deliverability is a known domain
- Landing page: MEDIUM -- layout and copy are Claude's discretion; technical implementation is straightforward

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (30 days -- stable stack, no fast-moving dependencies)
