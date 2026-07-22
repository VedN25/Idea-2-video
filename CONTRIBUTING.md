# Contributing to Idea2Video 🎬

Thank you for your interest in contributing! This guide will help you get started.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   `ash
   git clone https://github.com/YOUR_USERNAME/Idea-2-video.git
   cd Idea-2-video/idea2video
   `
3. **Install dependencies**:
   `ash
   pnpm install
   `
4. **Set up environment**:
   `ash
   cp .env.example .env
   # Edit .env with your keys (see [Environment Setup](#environment-setup))
   `
5. **Set up database**:
   `ash
   pnpm db:push
   `
6. **Start development**:
   `ash
   pnpm dev
   `

## 🌿 Branch Naming

Use descriptive branch names with prefixes:

| Prefix | Use Case |
|--------|----------|
| eat/ | New features |
| ix/ | Bug fixes |
| chore/ | Maintenance, deps, config |
| docs/ | Documentation only |
| efactor/ | Code restructuring |
| 	est/ | Adding tests |
| perf/ | Performance improvements |

Examples:
- eat/add-youtube-export
- ix/auth-redirect-loop
- chore/update-dependencies

## 📝 Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

`
<type>(<scope>): <description>

[optional body]

[optional footer]
`

### Types
- eat: New feature
- ix: Bug fix
- docs: Documentation changes
- style: Formatting, missing semicolons, etc.
- efactor: Code restructuring
- 	est: Adding tests
- chore: Maintenance

### Examples
`
feat(video): add YouTube Shorts export format

fix(auth): resolve Clerk redirect loop on signup

docs(readme): add Remotion setup instructions

chore(deps): update Next.js to 15.1.0
`

## ✅ Pre-Commit Checklist

Before pushing, run:

`ash
# 1. Lint
pnpm lint

# 2. Type check
pnpm tsc --noEmit

# 3. Tests
pnpm test

# 4. Build (catches production issues)
pnpm build
`

Or run all at once:
`ash
pnpm lint && pnpm tsc --noEmit && pnpm test && pnpm build
`

## 🧪 Testing Guidelines

### Unit Tests (Vitest)
- Place tests next to the code: Component.test.tsx
- Test pure functions, hooks, and utilities
- Use MSW for API mocking
- Aim for >80% coverage on critical paths

`ash
pnpm test           # Run once
pnpm test:watch     # Watch mode
pnpm test:ui        # Visual UI
pnpm test:coverage  # Coverage report
`

### E2E Tests (Playwright)
- Test critical user flows
- Place in 	ests/e2e/
- Use data-testid attributes

`ash
pnpm test:e2e       # Run headless
pnpm test:e2e:ui    # With UI
`

## 🎨 Code Style

### TypeScript
- Use strict mode (enabled in tsconfig.json)
- Prefer 	ype over interface for unions/intersections
- Use Zod schemas for runtime validation
- Avoid ny - use unknown or proper types

### React/Next.js
- Use Server Components by default
- Mark Client Components with 'use client'
- Use Radix UI primitives for accessible components
- Follow Tailwind CSS patterns

### File Organization
`
src/
├── components/
│   ├── ui/           # Base components (Button, Input, etc.)
│   └── feature/      # Feature-specific components
├── lib/
│   ├── feature/      # Feature-specific logic
│   └── utils.ts      # Shared utilities
├── hooks/            # Custom React hooks
└── types/            # Shared TypeScript types
`

### Naming Conventions
- Files: kebab-case.tsx (e.g., ideo-player.tsx)
- Components: PascalCase (e.g., VideoPlayer)
- Hooks: useCamelCase (e.g., useVideoPlayer)
- Types: PascalCase (e.g., VideoProject)
- Constants: SCREAMING_SNAKE_CASE

## 🔧 Development Tools

### Database
`ash
pnpm db:studio    # Open Drizzle Studio (GUI)
pnpm db:push      # Push schema changes (dev)
pnpm db:generate  # Generate migrations
pnpm db:migrate   # Run migrations
`

### Remotion (Video)
`ash
pnpm remotion:dev     # Preview compositions
pnpm remotion:build   # Build bundle
pnpm remotion:render  # Render to MP4
`

### Inngest (Background Jobs)
`ash
npx inngest-cli@latest dev  # Local dev server
`

## 🐛 Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

1. **Clear title** describing the issue
2. **Steps to reproduce** (numbered)
3. **Expected vs actual behavior**
4. **Environment**: OS, Node version, browser
5. **Screenshots/videos** if applicable
6. **Logs/error messages**

## 💡 Feature Requests

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md):

1. **Problem statement** - What problem does this solve?
2. **Proposed solution** - How should it work?
3. **Alternatives considered**
4. **Additional context** - Mockups, references, etc.

## 🔒 Security Issues

**Do not** open public issues for security vulnerabilities.

Email: security@idea2video.com (or create a private security advisory on GitHub)

## 📋 Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Ensure CI passes** (GitHub Actions)
4. **Request review** from maintainers
5. **Address feedback** promptly
6. **Squash commits** before merge (maintainers will do this)

### PR Title Format

Same as commit messages:
`
feat(video): add timeline zoom controls

fix(auth): handle expired session gracefully
`

### PR Description Template

`markdown
## Summary
Brief description of changes

## Type
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation
- [ ] Refactor

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing done

## Screenshots (if UI)

## Checklist
- [ ] Lint passes
- [ ] TypeScript compiles
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Docs updated
`

## 🏷️ Release Process

Maintainers handle releases:

1. Update version in package.json
2. Update CHANGELOG.md
3. Create git tag: git tag v0.2.0
4. Push tag: git push origin v0.2.0
5. GitHub Actions builds & deploys

## 🤝 Code of Conduct

Be respectful, inclusive, and constructive. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## 📞 Getting Help

- **Discord**: [Join our community](https://discord.gg/idea2video)
- **GitHub Discussions**: For questions & ideas
- **Issues**: For bugs & feature requests

---

**Happy coding!** 🎉

*Built with ❤️ by the Idea2Video team*
