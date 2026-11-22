# StudyPilot

An academic success planner for college students. It turns deadlines and course material into a realistic,
adaptive study schedule, and says honestly when there isn't enough time.

> Status: **Milestone 1 of Phase 1.** The scheduling engine and a demo page work with mock data. Accounts, a
> database, Canvas sync, and the AI tutor are not built yet. See the roadmap in
> [`docs/design/0001-studypilot-design.md`](docs/design/0001-studypilot-design.md).

## Quick start

Requires Node.js 22+.

```bash
npm install
npm run dev            # http://localhost:3000 → "Try with demo data"
npm run plan:demo      # print a plan for the mock student in the terminal
npm run plan:demo -- --miss 2   # ...then simulate missing two sessions and re-plan
```

## Checks

```bash
npm run lint
npm run typecheck
npm test               # unit, scenario and property-based tests (Vitest + fast-check)
npm run test:e2e       # Playwright, desktop + mobile (builds the app first)
FC_RUNS=3000 npm test  # longer property-based stress run
```

## Layout

| Path | What |
|---|---|
| `src/scheduler/` | Deterministic scheduling engine. Pure TypeScript with no I/O and an injected clock. Entry: `plan(input, clock)`. |
| `src/mock/` | Mock student data for demos and tests. |
| `src/app/` | Next.js App Router UI. |
| `scripts/plan-demo.ts` | CLI that prints a plan and simulates missed sessions. |
| `docs/design/` | Product and technical design. |
| `docs/adr/` | Architecture decision records. |
| `docker-compose.yml` | Local Postgres (pgvector), used from milestone M2. |

## Configuration

Copy `.env.example` to `.env.local`. Never commit secrets. Nothing is required to run the demo.
