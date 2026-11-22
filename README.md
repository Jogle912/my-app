# StudyPilot

An academic success planner for college students. It turns deadlines and course material into a realistic,
adaptive study schedule, and says honestly when there isn't enough time.

StudyPilot is a **phone app for Android and iPhone** (Expo / React Native) backed by a server API.

> Status: students can create an account in the app, enter courses, assignments, steps and weekly
> availability, and get a study plan computed on their phone. Canvas import and the AI features (study
> planner, calendar manager, tutor) are next. Roadmap: [`docs/design/0001-studypilot-design.md`](docs/design/0001-studypilot-design.md).

## Repository layout

| Path | What |
|---|---|
| `apps/mobile` | The Android + iPhone app (Expo). See [`apps/mobile/README.md`](apps/mobile/README.md) for running it on your phone. |
| `apps/server` | Backend: `/api/v1` JSON API, sign-in, database. (Its old web pages remain temporarily and will be removed once the app covers them.) |
| `packages/scheduler` | The deterministic scheduling engine, shared by the app (runs on-device) and the server. |

## Quick start (server)

Requires Node.js 22+ and PostgreSQL 16 (Docker Compose provides one).

```bash
npm install                                  # all workspaces; also generates the Prisma client
cp .env.example apps/server/.env             # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run db:up                                # Postgres in Docker (creates studypilot, _test, _e2e)
npm run db:deploy                            # apply migrations
npm run dev:server                           # API on http://localhost:3000
npm run dev:mobile                           # the phone app (see apps/mobile/README.md)
```

No database? The app's "Try the demo" screen and `npm run plan:demo` use built-in sample data.

## Checks

```bash
npm run lint                # all workspaces; server includes data-isolation import rules
npm run typecheck
npm test                    # scheduler, server (needs Postgres; uses studypilot_test) and mobile tests
npm run test:e2e            # server: API + browser tests (builds the server; uses studypilot_e2e)
FC_RUNS=3000 npm test -w @studypilot/scheduler   # longer property-based stress run
```

## Server layout

| Path (in `apps/server`) | What |
|---|---|
| `src/app/api/v1/` | JSON API used by the phone app. Every route goes through `apiRoute()` in `src/server/api.ts`. |
| `src/server/access/` | **The only code allowed to query the database.** Every function takes the signed-in student's id and filters every query by it. |
| `src/server/planning/` | Maps saved records to scheduler input (`/api/v1/plan-input`). |
| `src/server/auth.ts` | App sign-in (Better Auth, with the Expo plugin). Separate from Canvas OAuth. |
| `prisma/` | Schema and migrations. |

## Data isolation

- API routes, pages and server actions get the user id only from the session, never from request data.
- Repositories scope every query by that id. Another student's record looks exactly like a missing one.
- The database enforces it too: child rows reference their parent by `(id, userId)`, so a cross-student link
  is rejected even if app code is bypassed.
- ESLint blocks importing the database client outside `src/server/access`.
