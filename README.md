# Idea2Video 🎬

Transform ideas into professional videos using AI. Built with Next.js 15, Remotion, Inngest, Drizzle ORM, and Clerk.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ (recommended: use [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm))
- **pnpm** 9+ (or npm/yarn/bun)
- **Git**

### 1. Clone & Install

`ash
# Clone the repository
git clone https://github.com/VedN25/Idea-2-video.git
cd Idea-2-video/idea2video

# Install dependencies
pnpm install
# or: npm install
`

### 2. Environment Setup

`ash
# Copy the example environment file
cp .env.example .env

# Edit .env with your credentials (see [Environment Variables](#environment-variables))
# At minimum, you need:
# - Clerk keys (for auth)
# - Turso database URL & token (or use local SQLite)
`

### 3. Database Setup

**Option A: Local SQLite (easiest for development)**
`ash
# The project uses SQLite by default (local.db)
# Run migrations to create tables
pnpm db:push
# or: npx drizzle-kit push
`

**Option B: Turso (production-ready)**
`ash
# 1. Create a database at https://turso.tech
# 2. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to .env
# 3. Run migrations
pnpm db:push
`

### 4. Start Development

`ash
# Start all services (Next.js + Inngest dev server)
pnpm dev

# Or start separately:
# Terminal 1: Next.js
pnpm dev

# Terminal 2: Inngest dev server (for background jobs)
npx inngest-cli@latest dev
`

Open [http://localhost:3000](http://localhost:3000) 🎉

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| pnpm dev | Start Next.js dev server |
| pnpm build | Build for production |
| pnpm start | Start production server |
| pnpm lint | Run ESLint |
| pnpm test | Run unit tests (Vitest) |
| pnpm test:watch | Run tests in watch mode |
| pnpm test:ui | Open Vitest UI |
| pnpm test:coverage | Run tests with coverage |
| pnpm test:e2e | Run E2E tests (Playwright) |
| pnpm test:e2e:ui | Open Playwright UI |
| pnpm db:push | Push schema changes to database |
| pnpm db:studio | Open Drizzle Studio (DB GUI) |
| pnpm db:generate | Generate migrations |
| pnpm db:migrate | Run migrations |
| pnpm remotion:dev | Start Remotion preview server |
| pnpm remotion:build | Build Remotion video |
| pnpm remotion:render | Render video to MP4 |

## 🔧 Environment Variables

See [.env.example](.env.example) for all available variables.

### Required for Development

| Variable | Description | Get it from |
|----------|-------------|-------------|
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk public key | [Clerk Dashboard](https://dashboard.clerk.com) |
| CLERK_SECRET_KEY | Clerk secret key | [Clerk Dashboard](https://dashboard.clerk.com) |
| TURSO_DATABASE_URL | Database URL (libsql://...) | [Turso](https://turso.tech) or use local SQLite |
| TURSO_AUTH_TOKEN | Database auth token | [Turso](https://turso.tech) |

### Optional (AI Features)

| Variable | Description |
|----------|-------------|
| OPENROUTER_API_KEY | For LLM access (script generation) |
| ELEVENLABS_API_KEY | For voiceover generation |
| RUNWARE_API_KEY | For image/video generation |
| INNGEST_EVENT_KEY | For background job processing |
| UPSTASH_REDIS_REST_URL | For caching/rate limiting |
| STRIPE_SECRET_KEY | For billing/subscriptions |

### Feature Flags

`ash
NEXT_PUBLIC_ENABLE_AI_VIDEO_GEN=true   # Enable AI video generation
NEXT_PUBLIC_ENABLE_COLLABORATION=false # Enable real-time collaboration
NEXT_PUBLIC_ENABLE_BRAND_KIT=false     # Enable brand kits
`

## 🗄️ Database Commands

`ash
# Push schema changes directly (development)
pnpm db:push

# Generate migration files
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Drizzle Studio (visual DB editor)
pnpm db:studio
`

## 🎬 Remotion (Video Generation)

`ash
# Preview compositions in browser
pnpm remotion:dev

# Build video bundle
pnpm remotion:build

# Render to MP4
pnpm remotion:render
`

## 🧪 Testing

`ash
# Unit tests
pnpm test
pnpm test:watch
pnpm test:ui
pnpm test:coverage

# E2E tests
pnpm test:e2e
pnpm test:e2e:ui
`

## 📁 Project Structure

`
idea2video/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes (Hono)
│   │   ├── (auth)/            # Auth pages (sign-in, sign-up)
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   └── page.tsx           # Landing page
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components (Radix + Tailwind)
│   │   └── ...
│   ├── lib/
│   │   ├── ai/               # AI integrations (OpenRouter, ElevenLabs, Runware)
│   │   ├── auth/             # Clerk auth helpers
│   │   ├── db/               # Drizzle ORM (schema, client)
│   │   ├── inngest/          # Background jobs & functions
│   │   ├── api/              # Hono API setup
│   │   ├── env.ts            # Zod-validated env config
│   │   └── types/            # Shared TypeScript types
│   ├── remotion/             # Remotion compositions
│   │   ├── compositions/     # Video compositions
│   │   └── index.ts
│   └── hooks/                # Custom React hooks
├── drizzle/                  # Generated migrations
├── public/                   # Static assets
├── .env.example              # Environment template
├── drizzle.config.ts         # Drizzle configuration
├── remotion.config.ts        # Remotion configuration
├── vitest.config.ts          # Vitest configuration
└── package.json
`

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI + class-variance-authority
- **Database**: Drizzle ORM + SQLite (local) / Turso (prod)
- **Auth**: Clerk
- **Background Jobs**: Inngest
- **Video Generation**: Remotion
- **AI**: OpenRouter, ElevenLabs, Runware
- **Testing**: Vitest + Playwright
- **Linting**: ESLint 9 + Prettier

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. **Create a branch**: git checkout -b feat/your-feature
2. **Make changes** with tests
3. **Run checks**: pnpm lint && pnpm test && pnpm build
4. **Commit**: Use conventional commits (eat:, ix:, chore:)
5. **Push & PR**: Open a pull request

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Troubleshooting

### Port 3000 already in use
`ash
# Kill process on port 3000
npx kill-port 3000
# Or use a different port
PORT=3001 pnpm dev
`

### Database errors
`ash
# Reset local database
rm local.db
pnpm db:push
`

### Module not found errors
`ash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
`

### Inngest not receiving events
- Make sure Inngest dev server is running: 
px inngest-cli@latest dev
- Check INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY in .env

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Remotion Docs](https://www.remotion.dev/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs)
- [Inngest Docs](https://www.inngest.com/docs)
- [Clerk Docs](https://clerk.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
