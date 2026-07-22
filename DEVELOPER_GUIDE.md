# Developer Guide - Idea2Video

> **Internal documentation** for team members to understand the codebase, architecture, and development workflows.

---

## Progress Checklist

- [x] Architecture Overview
- [x] Key Directories
- [x] Authentication Flow
- [x] Database Patterns
- [x] Video Generation Pipeline
- [x] Testing Patterns
- [x] Deployment
- [x] Common Tasks
- [x] Environment Variables
- [x] Debugging
- [x] Useful Links

---

## Architecture Overview

## Key Directories

## Authentication Flow

## Database Patterns

## Video Generation Pipeline

## Testing Patterns

## Deployment

## Common Tasks

## Environment Variables

## Debugging

## Useful Links


## Architecture Overview

Idea2Video is a Next.js 15 App Router application with a layered architecture:

**Presentation Layer**
- Route groups: (auth) for Clerk pages, (dashboard) for protected pages, (public) for landing/marketing
- Middleware (src/middleware.ts) validates Clerk sessions on every request
- Server Components by default; Client Components opt-in with 'use client'
- Hono powers type-safe API routes under src/app/api/

**Business Logic Layer** (src/lib/)
- db/ — Drizzle ORM singleton (client.ts) + full schema (schema.ts, 20+ tables)
- uth/ — Server helpers (clerk.ts) for user sync/upsert; client hooks (client.tsx)
- i/ — Thin wrappers around OpenRouter (LLM), ElevenLabs (TTS), Runware (images/video)
- inngest/ — Background job definitions (unctions.ts) + testable pure logic (pure-functions.ts)
- pi/ — Hono app factory with auth middleware, Zod validation, error handling
- env.ts — Zod schema validates all env vars at startup; throws on missing required keys
- 	ypes/ — Shared TypeScript interfaces (e.g., ideo.ts)

**Video Generation Layer** (src/remotion/)
- React components registered as Remotion compositions
- MainComposition orchestrates scenes, audio, transitions
- Rendered via @remotion/renderer inside Inngest functions to MP4

**External Services**
- Clerk (auth), Turso/SQLite (DB), Inngest (jobs), Upstash Redis (cache), Stripe (billing)

Data flows: User action → API route → Inngest event → step functions → Remotion render → completed video.

## Key Directories

### src/app/ — Next.js App Router
`
src/app/
├── api/
│   ├── [[...route]]/route.ts    # Hono catch-all entry
│   └── v1/projects/route.ts     # REST endpoints
├── (auth)/
│   ├── sign-in/[[...sign-in]]/  # Clerk sign-in
│   └── sign-up/[[...sign-up]]/  # Clerk sign-up
├── (dashboard)/
│   ├── layout.tsx               # Auth check + sidebar
│   ├── projects/                # Project CRUD pages
│   ├── videos/                  # Video library
│   └── settings/                # User/org settings
├── layout.tsx                   # Root layout, providers
├── page.tsx                     # Landing page
└── globals.css                  # Tailwind + global styles
`

### src/lib/ — Shared Business Logic
`
src/lib/
├── ai/
│   ├── openrouter.ts   # LLM: scripts, storyboards
│   ├── elevenlabs.ts   # TTS: voiceovers
│   ├── runware.ts      # Image/video generation
│   └── index.ts        # Unified exports
├── auth/
│   ├── clerk.ts        # Server auth helpers
│   └── client.tsx      # Client hooks (useAuth, useUser)
├── db/
│   ├── client.ts       # Drizzle singleton
│   └── schema.ts       # All 20+ table definitions
├── inngest/
│   ├── client.ts       # Inngest client
│   ├── functions.ts    # Job definitions
│   ├── pure-functions.ts # Testable pure logic
│   └── __tests__/      # Unit tests
├── api/
│   └── hono.ts         # Hono app + middleware
├── env.ts              # Zod schema + validation
└── types/
    └── video.ts        # Video-related types
`

### src/remotion/ — Video Compositions
`
src/remotion/
├── compositions/
│   ├── MainComposition.tsx  # Root composition
│   ├── Scene.tsx            # Scene renderer
│   ├── TextOverlay.tsx      # Animated text
│   ├── AudioTrack.tsx       # Audio sync
│   ├── Transition.tsx       # Scene transitions
│   └── TestComposition.tsx  # Dev testing
└── index.ts                 # registerRoot()
`

Each directory has a single responsibility. src/lib/ is framework-agnostic TypeScript — reusable in scripts, workers, or tests.

## Authentication Flow

`
User visits /dashboard
    │
    ▼
Middleware (src/middleware.ts)
    │
    ├── Clerk validates session cookie
    │
    ├── Valid → proceed to page
    │
    └── Invalid → redirect /sign-in
    │
    ▼
Dashboard layout loads
    │
    ├── auth() gets Clerk user
    │
    ├── syncUserToDb() upserts to Drizzle
    │   ├── Creates if new
    │   ├── Updates last_seen
    │   ├── Checks subscription
    │   └── Tracks credits
    │
    └── Provides user to children
`

**Middleware** (src/middleware.ts)
- Uses @clerk/nextjs/server uthMiddleware()
- Protects all (dashboard) routes automatically
- Public routes: /, /sign-in, /sign-up, /api/webhooks/*

**User Sync** (src/lib/auth/clerk.ts)
`	ypescript
export async function syncUserToDb(clerkUser: User) {
  await db.insert(users).values({
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress,
    name: clerkUser.fullName,
    imageUrl: clerkUser.imageUrl,
    credits: 100, // default for new users
  }).onConflictDoUpdate({ target: users.id, set: {
    email: clerkUser.primaryEmailAddress?.emailAddress,
    name: clerkUser.fullName,
    imageUrl: clerkUser.imageUrl,
    updatedAt: new Date(),
  }});
}
`
- Called in (dashboard)/layout.tsx on every page load
- Upserts by Clerk ID (primary key)
- Maintains: credits, subscription tier, onboarding status, preferences

**Client-side**
- src/lib/auth/client.tsx exports useAuth(), useUser() hooks
- SignInButton, SignUpButton, UserButton from @clerk/nextjs

No custom session management — Clerk handles tokens, refresh, MFA.


## Database Patterns

### Schema Definition
`	ypescript
// src/lib/db/schema.ts
export const newTable = sqliteTable("new_table", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  data: text("data", { mode: "json" }).<{
    key: string;
    value: number;
  }>(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql(unixepoch())).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql(unixepoch())).notNull(),
}, (table) => ({
  userIdx: index("new_table_user_idx").on(table.userId),
}));
`

**Conventions**
- Primary keys: 	ext (Clerk IDs or UUIDs)
- Timestamps: integer with mode: "timestamp" + sql(unixepoch())`
- JSON columns: 	ext(..., { mode: "json" }).<Type>() for type safety
- Foreign keys: .references(() => parentTable.id, { onDelete: "cascade" })
- Indexes: defined in table options for query performance

### Migrations
`ash
# Development - push directly
pnpm db:push

# Production - generate + migrate
pnpm db:generate
pnpm db:migrate
`
- drizzle.config.ts points to ./src/lib/db/schema.ts, output ./drizzle
- Local dev uses ile:local.db (SQLite)
- Production uses Turso (libsql://...)

### Querying
`	ypescript
import { db } from "@/lib/db/client";
import { projects, scenes } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

// Simple query
const userProjects = await db
  .select()
  .from(projects)
  .where(eq(projects.userId, userId))
  .orderBy(desc(projects.createdAt));

// With relations (Drizzle query API)
const projectWithScenes = await db.query.projects.findFirst({
  where: eq(projects.id, projectId),
  with: {
    scenes: { orderBy: (scenes, { asc }) => [asc(scenes.order)] },
    voiceovers: true,
    musicTrack: true,
  },
});

// Transactions
await db.transaction(async (tx) => {
  await tx.insert(projects).values({ ... });
  await tx.insert(scenes).values([...]);
});
`

### Client Singleton
`	ypescript
// src/lib/db/client.ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN });
export const db = drizzle(client, { schema });
`
- Single instance per process (serverless-friendly)
- Schema imported for full type inference

### Drizzle Studio
`ash
pnpm db:studio  # Opens http://localhost:4983
`
Visual table browser, run queries, inspect data.


## Video Generation Pipeline

### 1. Project Creation
`	ypescript
// POST /api/v1/projects
const project = await db.insert(projects).values({
  userId,
  title: "My Video",
  platform: "youtube",
  duration: 60,
  status: "draft",
}).returning();

// Trigger pipeline
await inngest.send({
  name: "project.created",
  data: { projectId: project[0].id },
});
`

### 2. Inngest Functions (src/lib/inngest/functions.ts)

Each step is a separate function for:
- **Retryability** - failed steps retry independently
- **Observability** - track progress in Inngest dashboard
- **Parallelization** - independent steps run concurrently

`
project.created
    │
    ▼
script.generate (OpenRouter)
    │
    ▼
storyboard.create
    │
    ▼
assets.generate (Runware - images/video)
    │
    ▼
voiceover.generate (ElevenLabs)
    │
    ▼
video.compose (Remotion)
    │
    ▼
video.render (Remotion → MP4)
    │
    ▼
project.completed
`

### 3. Remotion Rendering
`	ypescript
// In Inngest function
const { renderMedia } = await import("@remotion/renderer");

await renderMedia({
  composition: "MainComposition",
  inputProps: { projectData },
  outputLocation: s3://bucket/videos/.mp4,
  codec: "h264",
});
`

### Key Files
- src/lib/inngest/functions.ts — all step functions
- src/lib/inngest/pure-functions.ts — testable logic (duration calc, etc.)
- src/remotion/compositions/MainComposition.tsx — root composition
- src/remotion/index.ts — 
egisterRoot() with all compositions

### Local Development
`ash
pnpm remotion:dev     # Preview at http://localhost:3000/remotion
pnpm remotion:build   # Build bundle
pnpm remotion:render  # Render to MP4
`

### Composition Props
`	ypescript
interface ProjectData {
  project: Project;
  script: Script;
  storyboard: Storyboard;
  scenes: Scene[];
  voiceovers: Voiceover[];
  musicTrack?: MusicTrack;
}
`
Passed as inputProps to Remotion; each component reads what it needs.

## Testing Patterns

### Unit Tests (Vitest)
`	ypescript
// src/lib/inngest/__tests__/pure-functions.test.ts
import { describe, it, expect } from "vitest";
import { calculateSceneDuration } from "../pure-functions";

describe("calculateSceneDuration", () => {
  it("distributes duration evenly", () => {
    expect(calculateSceneDuration(60, 3)).toEqual([20, 20, 20]);
  });
  it("handles remainder", () => {
    expect(calculateSceneDuration(61, 3)).toEqual([21, 20, 20]);
  });
});
`

`ash
pnpm test           # Run once
pnpm test:watch     # Watch mode
pnpm test:ui        # Visual UI
pnpm test:coverage  # Coverage report
`

**Patterns**
- Test pure functions in src/lib/inngest/pure-functions.ts
- Mock external APIs with MSW (@mswjs/interceptors)
- Use @faker-js/faker for test data
- Co-locate tests: __tests__/ next to source

### API Tests
`	ypescript
// src/app/api/__tests__/projects.test.ts
import { describe, it, expect } from "vitest";
import { createTestClient } from "@/test/utils";

describe("POST /api/v1/projects", () => {
  it("creates a project", async () => {
    const client = createTestClient();
    const res = await client.post("/api/v1/projects", {
      json: { title: "Test", platform: "tiktok" },
    });
    expect(res.status).toBe(201);
    expect(res.json()).toHaveProperty("id");
  });
});
`
- Hono test client for in-memory request/response
- Test validation, auth, error cases

### E2E Tests (Playwright)
`	ypescript
// tests/e2e/project-creation.spec.ts
import { test, expect } from "@playwright/test";

test("user can create a project", async ({ page }) => {
  await page.goto("/dashboard/projects/new");
  await page.fill("[data-testid=title-input]", "My Video");
  await page.click("[data-testid=submit-button]");
  await expect(page).toHaveURL(/\/dashboard\/projects\/\w+/);
});
`

`ash
pnpm test:e2e       # Headless
pnpm test:e2e:ui    # With UI
`

**Patterns**
- Use data-testid attributes for stable selectors
- Test critical user flows: auth, project CRUD, video generation
- Run against local dev server

### Test Structure
`
src/
├── lib/inngest/__tests__/     # Unit tests
├── app/api/__tests__/         # API tests
└── test/utils.ts              # Test helpers

tests/
└── e2e/                       # Playwright specs
`

### CI Integration
- GitHub Actions runs pnpm test && pnpm test:e2e on PR
- Coverage threshold: 80% for src/lib/

## Deployment

### Vercel (Recommended)

1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

**Required Vercel env vars:**
- All from .env.example
- INNGEST_SIGNING_KEY (generate: 
px inngest-cli@latest keys create)

**Build command:** pnpm build
**Output directory:** .next
**Install command:** pnpm install

### Inngest Cloud

1. Create account at [inngest.com](https://inngest.com)
2. Add signing key to Vercel env vars
3. Functions deploy automatically with Vercel

**Local dev:** 
px inngest-cli@latest dev

### Database (Turso)

1. Create database at [turso.tech](https://turso.tech)
2. Run migrations against production DB:
   `ash
   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... pnpm db:migrate
   `
3. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to Vercel

### Environment Variables by Environment

| Variable | Development | Production |
|----------|-------------|------------|
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | pk_test_... | pk_live_... |
| CLERK_SECRET_KEY | sk_test_... | sk_live_... |
| TURSO_DATABASE_URL | file:local.db | libsql://... |
| TURSO_AUTH_TOKEN | (empty) | token |
| INNGEST_EVENT_KEY | (from dev) | from Inngest Cloud |
| INNGEST_SIGNING_KEY | (from dev) | from Inngest Cloud |
| OPENROUTER_API_KEY | test key | production key |
| ELEVENLABS_API_KEY | test key | production key |
| RUNWARE_API_KEY | test key | production key |
| UPSTASH_REDIS_REST_URL | optional | required |
| STRIPE_SECRET_KEY | sk_test_... | sk_live_... |

### Preview Deployments
- Every PR gets a preview URL
- Inngest creates temporary functions for preview
- Database: use Turso branch or local SQLite

### Rollback
- Vercel: instant rollback to previous deployment
- Inngest: versioned functions, redeploy previous
- Database: run down migrations if needed

## Common Tasks

### Add API Endpoint
`	ypescript
// src/app/api/v1/new-endpoint/route.ts
import { createRoute } from "@/lib/api/hono";
import { z } from "zod";

export const POST = createRoute()
  .post(
    "/new-endpoint",
    z.object({ body: z.object({ name: z.string() }) }),
    async (c) => {
      const { name } = c.req.valid("json");
      // ... logic
      return c.json({ success: true });
    }
  );
`
- createRoute() provides auth middleware, Zod validation, error handling
- Export HTTP methods: GET, POST, PUT, DELETE, PATCH
- Input validation via Zod schemas

### Add Inngest Function
`	ypescript
// src/lib/inngest/functions.ts
export const newFunction = inngest.createFunction(
  { id: "new-function", retries: 3 },
  { event: "app/new-event" },
  async ({ event, step }) => {
    const result = await step.run("step-name", async () => {
      // ... logic
      return { data: "result" };
    });
    
    await step.sendEvent("next-step", {
      name: "app/next-event",
      data: { ...event.data, result },
    });
  }
);
`
- step.run() — retriable, idempotent work
- step.sendEvent() — trigger next function
- step.sleep() — delay execution
- Register in src/lib/inngest/client.ts

### Add Remotion Composition
`	ypescript
// src/remotion/compositions/NewComposition.tsx
export const NewComposition: React.FC<{ projectData: ProjectData }> = (
  { projectData }
) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  
  return (
    <div style={styles.container}>
      {/* Your composition */}
    </div>
  );
};

// Register in src/remotion/index.ts
registerRoot({
  ...
  NewComposition,
});
`
- Use useCurrentFrame(), useVideoConfig() for timing
- Receive data via inputProps
- Test in browser: pnpm remotion:dev

### Add Database Table
1. Define in src/lib/db/schema.ts
2. Run pnpm db:push (dev) or pnpm db:generate && pnpm db:migrate (prod)
3. Import types: export type NewTable = typeof newTable.;

### Add AI Integration
1. Create wrapper in src/lib/ai/ (e.g., 
ewservice.ts)
2. Export from src/lib/ai/index.ts
3. Add env vars to .env.example and src/lib/env.ts
4. Use in Inngest functions via step.run()

### Run Tests
`ash
pnpm test           # Unit tests
pnpm test:watch     # Watch mode
pnpm test:ui        # Visual UI
pnpm test:coverage  # Coverage report
pnpm test:e2e       # E2E tests
pnpm test:e2e:ui    # E2E with UI
`

### Type Check
`ash
pnpm tsc --noEmit  # Full TypeScript check
`

### Lint & Format
`ash
pnpm lint          # ESLint
pnpm format        # Prettier
`

### Database Studio
`ash
pnpm db:studio  # Opens http://localhost:4983
`

### Remotion Preview
`ash
pnpm remotion:dev  # Opens http://localhost:3000/remotion
`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | ✅ | Clerk public key |
| CLERK_SECRET_KEY | ✅ | Clerk secret key |
| TURSO_DATABASE_URL | ✅ | Database URL (libsql://... or file:local.db) |
| TURSO_AUTH_TOKEN | ✅* | Database auth token (empty for local SQLite) |
| OPENROUTER_API_KEY | ⚠️ | AI script/storyboard generation |
| ELEVENLABS_API_KEY | ⚠️ | Voiceover generation |
| RUNWARE_API_KEY | ⚠️ | Image/video generation |
| INNGEST_EVENT_KEY | ⚠️ | Background job processing |
| INNGEST_SIGNING_KEY | ⚠️ | Verify Inngest events |
| UPSTASH_REDIS_REST_URL | ❌ | Caching/rate limiting |
| UPSTASH_REDIS_REST_TOKEN | ❌ | Redis auth token |
| STRIPE_SECRET_KEY | ❌ | Billing/subscriptions |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | ❌ | Stripe client key |
| STRIPE_WEBHOOK_SECRET | ❌ | Stripe webhook verification |
| NEXT_PUBLIC_APP_URL | ✅ | App URL (http://localhost:3000) |
| NEXT_PUBLIC_APP_NAME | ✅ | App name (Idea2Video) |
| REMOTION_SERVE_URL | ✅ | Remotion serve URL |
| REMOTION_RENDER_URL | ✅ | Remotion render URL |
| NEXT_PUBLIC_ENABLE_AI_VIDEO_GEN | ❌ | Feature flag: AI video gen |
| NEXT_PUBLIC_ENABLE_COLLABORATION | ❌ | Feature flag: collaboration |
| NEXT_PUBLIC_ENABLE_BRAND_KIT | ❌ | Feature flag: brand kits |

✅ = Required for app to start
⚠️ = Required for full feature set
❌ = Optional

### Validation
- src/lib/env.ts uses Zod schema
- Throws on startup if required vars missing
- Run pnpm dev to validate

### Local Development
`ash
cp .env.example .env
# Edit .env with your keys
pnpm dev
`

### Getting Keys
- **Clerk**: https://dashboard.clerk.com → API Keys
- **Turso**: https://turso.tech → Create database → Show connection info
- **OpenRouter**: https://openrouter.ai/keys
- **ElevenLabs**: https://elevenlabs.io/app/settings/api-keys
- **Runware**: https://runware.ai/dashboard/api-keys
- **Inngest**: https://app.inngest.com → Settings → Signing Keys
- **Upstash**: https://console.upstash.com → Redis → REST API
- **Stripe**: https://dashboard.stripe.com/apikeys

## Debugging

### Inngest Not Triggering
`ash
# Check dev server is running
npx inngest-cli@latest dev

# Verify event key in .env
cat .env | grep INNGEST

# Check Inngest dashboard for received events
# Local: http://localhost:8288
`
- Ensure INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY match
- Functions must be registered in src/lib/inngest/client.ts
- Check browser network tab for /api/inngest calls

### Database Issues
`ash
# Open Drizzle Studio
pnpm db:studio

# Reset local DB
rm local.db && pnpm db:push

# Check migration status
ls drizzle/

# Verify schema matches DB
pnpm db:push --dry-run
`
- Local: ile:local.db (SQLite)
- Production: libsql://... (Turso)
- Run pnpm db:generate after schema changes

### Remotion Render Fails
`ash
# Test composition in browser
pnpm remotion:dev

# Check composition registration
# src/remotion/index.ts

# Verify inputProps match composition props
# Check console for Remotion errors
`
- Compositions must be registered in 
egisterRoot()
- inputProps must match component prop types
- Check @remotion/renderer version matches @remotion/cli

### TypeScript Errors
`ash
# Full type check
pnpm tsc --noEmit

# Common fixes:
# - Import types with import type
# - Check Zod schema matches runtime data
# - Verify Drizzle schema imports
`

### Build Failures
`ash
# Clear cache and rebuild
rm -rf .next node_modules
pnpm install
pnpm build
`

### Clerk Auth Issues
- Check middleware matcher in src/middleware.ts
- Verify NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY
- Check Clerk dashboard for allowed origins
- Ensure /sign-in and /sign-up are public routes

### API Errors
- Check Hono error handler in src/lib/api/hono.ts
- Validate Zod schemas match request bodies
- Check server logs for stack traces

### Performance
- Enable React DevTools Profiler
- Check for unnecessary re-renders
- Use 
ext build --profile for bundle analysis
- Monitor Inngest function duration in dashboard

### Logs
- Vercel: Functions tab → View logs
- Inngest: Dashboard → Functions → View runs
- Local: Terminal output + browser console

## Useful Links

### Official Documentation
- [Next.js 15 Docs](https://nextjs.org/docs) — App Router, Server Components, Middleware
- [Drizzle ORM Docs](https://orm.drizzle.team/docs) — Schema, queries, migrations, relations
- [Inngest Docs](https://www.inngest.com/docs) — Functions, steps, deployment, dashboard
- [Remotion Docs](https://www.remotion.dev/docs) — Compositions, rendering, audio, CLI
- [Clerk Next.js Guide](https://clerk.com/docs/quickstarts/nextjs) — Auth, middleware, hooks
- [Hono Docs](https://hono.dev/docs) — Routing, validation, middleware, testing
- [Zod Docs](https://zod.dev) — Schema validation, inference, error formatting
- [Tailwind CSS 4](https://tailwindcss.com/docs) — Utility classes, config, dark mode
- [Radix UI](https://www.radix-ui.com/docs/primitives/overview/introduction) — Accessible primitives

### API References
- [OpenRouter API](https://openrouter.ai/docs) — Models, parameters, streaming
- [ElevenLabs API](https://elevenlabs.io/docs/api-reference) — TTS, voices, streaming
- [Runware API](https://docs.runware.ai) — Image/video generation, models
- [Turso/libSQL](https://docs.turso.tech) — HTTP client, replication, CLI
- [Upstash Redis](https://upstash.com/docs/redis) — REST API, rate limiting
- [Stripe API](https://stripe.com/docs/api) — Subscriptions, webhooks, checkout

### Tools & Utilities
- [Vitest](https://vitest.dev) — Unit testing, coverage, UI
- [Playwright](https://playwright.dev) — E2E testing, trace viewer
- [ESLint](https://eslint.org) — Linting, TypeScript rules
- [Prettier](https://prettier.io) — Formatting, config
- [TypeScript](https://www.typescriptlang.org/docs) — Type system, config

### Project-Specific
- GitHub repo: https://github.com/VedN25/Idea-2-video
- Inngest dashboard: https://app.inngest.com
- Vercel dashboard: https://vercel.com/dashboard
- Clerk dashboard: https://dashboard.clerk.com
- Turso dashboard: https://turso.tech/dashboard

### Community & Support
- Next.js Discord: https://discord.gg/nextjs
- Drizzle Discord: https://discord.gg/drizzle
- Inngest Discord: https://discord.gg/inngest
- Remotion Discord: https://discord.gg/remotion
- Clerk Discord: https://discord.gg/clerk

---

*Last updated: 2025-07-22*
*For questions, ask in #dev channel or create a GitHub Discussion*

## gstack Integration

This project uses [gstack](https://github.com/garrytan/gstack) — Garry Tan's personal Claude Code skill pack with 23 specialized AI agents for different roles.

### What is gstack?

gstack provides slash commands that act as specialized AI agents:

| Role | Skills |
|------|--------|
| **CEO** | /office-hours, /plan-ceo-review, /cso |
| **Designer** | /design-consultation, /design-shotgun, /design-html, /design-review, /ios-design-review |
| **Eng Manager** | /plan-eng-review, /review, /devex-review, /pair-agent |
| **Release Manager** | /ship, /land-and-deploy, /canary, /gstack-upgrade |
| **Doc Engineer** | /document-release, /document-generate |
| **QA** | /qa, /qa-only, /benchmark, /browse, /open-gstack-browser, /setup-browser-cookies |
| **General** | /autoplan, /codex, /careful, /freeze, /guard, /unfreeze, /investigate, /retro, /learn, /setup-deploy, /setup-gbrain, /sync-gbrain, /diagram, /extension, /health, /hosts, /ios-clean, /context-save, /context-restore |

### Installation

#### Option 1: Project-Local (Recommended for Teams)
`ash
# In project root
mkdir -p .agents/skills
git clone https://github.com/garrytan/gstack .agents/skills/gstack
cd .agents/skills/gstack
./setup --host claude
`

#### Option 2: Git Submodule (Version Controlled)
`ash
git submodule add https://github.com/garrytan/gstack .agents/skills/gstack
cd .agents/skills/gstack
./setup --host claude
`

#### Option 3: Global Install
`ash
git clone https://github.com/garrytan/gstack ~/.claude/skills/gstack
cd ~/.claude/skills/gstack
./setup --no-prefix  # shorter commands: /qa instead of /gstack-qa
`

### Key Workflows

#### Feature Planning
`ash
/autoplan "Add video export to MP4 with custom bitrate"
# → Creates SPEC.md with implementation plan

/plan-eng-review SPEC.md
# → Engineering manager review of the plan
`

#### Design
`ash
/design-consultation "Need a video timeline editor UI"
# → Design advice and suggestions

/design-shotgun
# → Rapid design exploration (multiple concepts)

/design-html
# → Build interactive HTML prototype
`

#### Code Review
`ash
/review
# → Eng manager style code review

/devex-review
# → Developer experience review
`

#### QA & Testing
`ash
/qa
# → Full QA suite: tests, typecheck, build, lint

/qa-only
# → QA only (no auto-fixes)

/benchmark
# → Performance benchmarks
`

#### Release & Deploy
`ash
/ship
# → Version bump, changelog, git tag

/land-and-deploy
# → Deploy to Vercel + verification

/canary
# → Canary deployment
`

#### Documentation
`ash
/document-generate
# → Generate docs from code

/document-release
# → Write release notes
`

#### Debugging & Investigation
`ash
/investigate "Video render fails on long videos"
# → Systematic debugging

/careful
# → Extra validation mode
`

#### Context Management
`ash
/context-save "feature-video-export"
# → Save current context

/context-restore "feature-video-export"
# → Restore context later
`

### Web Browsing

**Use /browse instead of built-in browser tools:**
`ash
/browse https://example.com
# → Opens page, returns content

/open-gstack-browser
# → Persistent browser session
`

### Setup Commands
`ash
/setup-browser-cookies
# → Configure browser authentication

/setup-deploy
# → Configure deployment targets

/setup-gbrain
# → Initialize knowledge base

/sync-gbrain
# → Sync knowledge base
`

### Team Onboarding

Add to your CLAUDE.md:
`markdown
## gstack
Use /browse from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.
Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /design-shotgun, /design-html, /review, /ship, /land-and-deploy,
/canary, /benchmark, /browse, /open-gstack-browser, /qa, /qa-only, /design-review,
/setup-browser-cookies, /setup-deploy, /setup-gbrain, /sync-gbrain, /retro,
/investigate, /document-release, /document-generate, /codex, /cso, /autoplan,
/pair-agent, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn.
`

### .gitignore Additions
`ash
# gstack local install
.agents/skills/gstack/node_modules
.agents/skills/gstack/dist
`

### Upgrading
`ash
cd .agents/skills/gstack
git pull
./setup --host claude
`

Or use the built-in command:
`ash
/gstack-upgrade
`

### For Future Projects

1. **Add as submodule** to new repos:
   `ash
   git submodule add https://github.com/garrytan/gstack .agents/skills/gstack
   `

2. **Include in project template** — add .agents/skills/gstack to your starter template

3. **Team convention** — document which skills your team uses in each project's CLAUDE.md

### Useful Links
- [gstack Repository](https://github.com/garrytan/gstack)
- [Garry Tan's Blog](https://blog.garrytan.com)
- [Claude Code Docs](https://docs.anthropic.com/claude-code)

---

*Last updated: 2025-07-22*
