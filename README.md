# StudyPilot

An academic success planner for college students. It turns deadlines and course material into a realistic,
adaptive study schedule, and says honestly when there isn't enough time.

> Status: **Milestone 2 of Phase 1.** Students can create an account, enter their courses, assignments, steps
> and weekly availability, and get a study plan built from their own data. Canvas import, the calendar grid,
> and the AI features (study planner, calendar manager, tutor) are next. See the roadmap in
> [`docs/design/0001-studypilot-design.md`](docs/design/0001-studypilot-design.md).

## Quick start

Requires Node.js 22+ and PostgreSQL 16 (Docker Compose provides one).

```bash
npm install                 # also generates the Prisma client
cp .env.example .env        # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run db:up               # Postgres in Docker (creates studypilot, studypilot_test, studypilot_e2e)
npm run db:deploy           # apply migrations
npm run dev                 # http://localhost:3000 → Create account
```

No database? `/demo` and `npm run plan:demo` work with built-in mock data.

## Checks

```bash
npm run lint                # includes data-isolation import rules
npm run typecheck
npm test                    # scheduler, mapping, and database tests (needs Postgres; uses studypilot_test)
npm run test:e2e            # Playwright, desktop + mobile (builds the app; uses studypilot_e2e)
FC_RUNS=3000 npm test       # longer property-based stress run for the scheduler
```

## Layout

| Path | What |
|---|---|
| `src/scheduler/` | Deterministic scheduling engine. Pure TypeScript with no I/O and an injected clock. Entry: `plan(input, clock)`. |
| `src/server/access/` | **The only code allowed to query the database.** Every function takes the signed-in student's id and filters every query by it. Validation lives in `schemas.ts`. |
| `src/server/planning/` | Maps saved records to scheduler input. |
| `src/server/auth.ts` | App sign-in (Better Auth). Separate from Canvas OAuth. |
| `src/app/(app)/` | Signed-in pages: Today, Plan, Courses, assignment detail, My week. `actions.ts` holds the server actions. |
| `src/app/(auth)/` | Sign-in and sign-up. |
| `prisma/` | Schema and migrations. |
| `docs/design/`, `docs/adr/` | Product and technical design; architecture decisions. |

## Data isolation

- Pages and server actions get the user id only from the session (`requireUser()`), never from form data.
- Repositories scope every query by that id. Another student's record looks exactly like a missing one.
- The database enforces it too: child rows reference their parent by `(id, userId)`, so a cross-student link
  is rejected even if app code is bypassed.
- ESLint blocks importing the database client outside `src/server/access`.
