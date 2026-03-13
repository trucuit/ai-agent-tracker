# AI Agent Tracker

A public website that surfaces trending GitHub repositories about AI Agents. Users can discover, filter, and track the most active open-source AI Agent projects in real time.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), Tailwind CSS 4, TypeScript |
| Backend API | Node.js + Express 5, TypeScript |
| Database | PostgreSQL 17, Drizzle ORM |
| Monorepo | Turborepo + pnpm workspaces |
| CI/CD | GitHub Actions |
| Deployment | Vercel (web), Railway (API) |

## Monorepo Structure

```
/
├── apps/
│   ├── web/          # Next.js 15 frontend
│   └── api/          # Node.js + Express API
├── packages/
│   ├── db/           # Drizzle ORM schema + migrations
│   └── shared/       # Shared TypeScript types & constants
├── .github/
│   └── workflows/    # CI/CD pipelines
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9.15.4
- PostgreSQL 17

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Run database migrations
pnpm --filter @ai-tracker/db db:push

# Start development servers
pnpm dev
```

### Environment Variables

#### API (`apps/api/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | API server port (default: 3001) |
| `GITHUB_TOKEN` | GitHub Personal Access Token for API crawling |

#### Web (`apps/web/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API server URL |

## Development

```bash
pnpm dev          # Start all apps in dev mode
pnpm build        # Build all apps
pnpm typecheck    # Run TypeScript checks
pnpm lint         # Run linters
pnpm test         # Run tests
```

## Deployment

- **Frontend**: Deployed to Vercel via GitHub Actions on push to `main`
- **API**: Deployed to Railway via GitHub Actions on push to `main`
- **Data sync**: Runs every 6 hours via GitHub Actions scheduled workflow

## CI/CD

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `ci.yml` | PRs + push to main | Typecheck, Lint, Build, Test |
| `deploy.yml` | Push to main | Deploy web (Vercel), Deploy API (Railway) |
| `sync-github-data.yml` | Every 6h + manual | Crawl & index GitHub repos |
