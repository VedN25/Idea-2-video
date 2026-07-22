# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive README.md with setup instructions, scripts, environment variables, project structure, and troubleshooting
- CONTRIBUTING.md with development workflow, branch naming, commit conventions, testing guidelines, and PR process
- CODE_OF_CONDUCT.md based on Contributor Covenant
- GitHub Issue Templates:
  - Bug Report (.github/ISSUE_TEMPLATE/bug_report.yml)
  - Feature Request (.github/ISSUE_TEMPLATE/feature_request.yml)
- Updated .gitignore to exclude local.db, drizzle/meta/_journal.json, IDE files, and OS files
- .env.example with all required and optional environment variables documented

### Changed
- Updated .gitignore to be more comprehensive
- Improved project documentation for onboarding

## [0.1.0] - 2025-07-22

### Added
- Initial project setup with Next.js 15 (App Router)
- TypeScript 5 with strict mode
- Tailwind CSS 4 for styling
- Radix UI primitives for accessible components
- Clerk authentication integration
- Drizzle ORM with SQLite (local) / Turso (production)
- Inngest for background job processing
- Remotion for programmatic video generation
- AI integrations:
  - OpenRouter (LLM for script generation)
  - ElevenLabs (text-to-speech)
  - Runware (image/video generation)
- Hono for type-safe API routes
- Zod for runtime validation
- Vitest for unit testing
- Playwright for E2E testing
- ESLint 9 + Prettier for code quality
- Comprehensive database schema:
  - Users, Organizations, Organization Members
  - Projects, Project Versions, Scripts, Storyboards
  - Assets, Videos, Scenes, Voiceovers, Music Tracks
  - Brand Kits, Credits, Subscriptions, Notifications
  - Templates, Collaborations, Comments
  - Webhooks, API Keys

### Infrastructure
- Local SQLite database (local.db) for development
- Drizzle migrations in /drizzle folder
- Environment validation with Zod (src/lib/env.ts)
- Inngest functions for video generation pipeline
- Remotion compositions for video rendering


