# lightspeed-search

AI product search, storefront alerts and an embeddable widget for [Lightspeed eCom](https://www.lightspeedhq.com/ecommerce/) webshops.

A shop installs it through Lightspeed's app flow. It syncs the catalog, embeds every product, and replaces the storefront's search box with a hybrid keyword + semantic search, so a query like "warm jacket for hiking" finds products even when those exact words aren't in the title.

> **Status:** built in May–June 2026 and tested end to end against a live Lightspeed shop (OAuth install, catalog sync, search, alerts). It's no longer in active development. The internal codename is `aidey`, which is why the packages are scoped `@aidey/*`.

## What it does

- **Hybrid search:** Postgres full-text ranking combined with pgvector cosine similarity, in a single query
- **Catalog sync:** pulls products, categories and variants from Lightspeed on install, on a schedule and from webhooks
- **Storefront alerts:** banners and notices that shop owners manage from the dashboard
- **Embeddable widget:** a small loader script mounts the search and alert widgets on any Lightspeed theme
- **Onboarding:** OAuth install with signature verification, plus a server-side check that the widget is actually live on the storefront

## Stack

| Layer | Tech |
|---|---|
| Backend | [Bun](https://bun.sh) + [Hono](https://hono.dev) + [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) |
| Frontend | Vite + React 19 + [TanStack Router](https://tanstack.com/router) + [TanStack Query](https://tanstack.com/query) + Tailwind 4 + shadcn/ui |
| Widget | [Preact](https://preactjs.com) (multi-entry build, ~6 KB gzipped per addon) |
| Database | Postgres + [Drizzle ORM](https://orm.drizzle.team) + [pgvector](https://github.com/pgvector/pgvector) |
| Auth | [Better Auth](https://www.better-auth.com) (magic link + 6-digit code) |
| Email | [Resend](https://resend.com) (dev mode logs to console) |
| Embeddings | OpenAI `text-embedding-3-small` |
| Search | tsvector (lexical) + pgvector (cosine) hybrid query |
| Validation | [Zod](https://zod.dev) v4 |
| Generated client | [@hey-api/openapi-ts](https://heyapi.dev) (committed) |
| Lint/format | [Biome](https://biomejs.dev) |
| Git hooks | [Lefthook](https://github.com/evilmartians/lefthook) |

## Setup

```bash
bun install
docker compose up -d postgres
bun run db:migrate
bun dev
```

Open [http://localhost:5173](http://localhost:5173).

The dev loop runs four watchers via [concurrently](https://github.com/open-cli-tools/concurrently): API on `:3001` (with hot reload), web on `:5173` (with HMR), contracts type-emit, and the api-client regenerator (refreshes when the OpenAPI doc actually changes - ~5s polling, content-diffed).

## Layout

```
lightspeed-search/
├── apps/
│   ├── api/                       Hono + zod-openapi
│   ├── web/                       Vite + React + TanStack + Tailwind + shadcn
│   └── widget/                    Preact, three IIFE bundles (loader, alerts, search)
└── packages/
    ├── contracts/                 Zod schemas - single source of truth
    ├── api-client/                Generated typed fetcher + TanStack Query hooks
    ├── database/                  Drizzle connection + migrations
    ├── lightspeed/                Typed Lightspeed API client + signature/rate-limit
    ├── tsconfig/                  Shared base/lib/app TS configs
    └── contexts/
        ├── identity/              Better Auth wrapper + magic-link plugin
        ├── shops/                 Shop entity + onboarding (manual + OAuth)
        ├── catalog/               Products / categories / variants
        ├── sync/                  Lightspeed pull + cron + webhook
        ├── search/                Embeddings + hybrid query + configs
        └── alerts/                Alerts CRUD
```

Each context follows the same shape: `domain/` (pure types), `application/` (named-function use cases), `infrastructure/` (drizzle queries + external clients), single public `index.ts`.

## Scripts

| Command | What it does |
|---|---|
| `bun dev` | Start api + web + contracts + api-client watchers (concurrently, clean Ctrl+C) |
| `bun run check` | Biome lint + typecheck across all packages |
| `bun run test` | Run tests in every package |
| `bun run gen` | Regenerate the api-client from a running api |
| `bun run db:generate` | drizzle-kit generate (creates a migration from schema diffs) |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:push` | Push schema directly (dev only) |
| `bun run db:studio` | Open drizzle-kit studio |
| `bun run format` | Auto-fix with Biome |

Per-app:
- `bun --filter @aidey/widget build` - build all three widget bundles to `dist/`

## Architecture notes

- **Contract spine**: Zod schemas in `@aidey/contracts` → API uses `@hono/zod-openapi` to expose `/openapi.json` → `@aidey/api-client` is generated from that doc and committed. Refactor flow: rename a field in contracts → API errors → web errors. End-to-end safety, no manual sync.
- **Light DDD**: each context has a single public `index.ts`; cross-context calls go through the public surface only. Branded ID types (`type AlertId = string & { __brand: "AlertId" }`) for compile-time discipline at no runtime cost.
- **Per-context schema ownership**: drizzle-kit reads schema files via the glob `packages/contexts/*/src/infrastructure/schema.ts`. Single migration history, multiple owners.
- **Sync resilience**: every sync wraps in a per-shop Postgres advisory lock. The cron tick wraps in a global lock so multi-instance deploys don't double-fire. Failures land in `sync_logs` and the loop continues for other shops.
- **Search**: hybrid query is `0.5 * ts_rank + 0.5 * (1 - cosine_distance)`. Embedding regen is content-hash-cached so re-syncs of unchanged products cost zero OpenAI calls.
- **Widget auth**: domain-based via the `widget_domains` table seeded on shop creation. No user session involved.

## CI

GitHub Actions workflow at `.github/workflows/check.yml` runs `bun install`, `bun run db:migrate`, `bun run check`, and `bun run test` on every PR and push to main, with a Postgres + pgvector service.

## License

[MIT](LICENSE)
