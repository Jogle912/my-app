# ADR-0001: Foundations for StudyPilot

Status: Accepted · 2026-11-22

## Context
The repository previously held a 2023 Electron + webpack prototype with an unwired OpenAI v3 call and a
hardcoded Canvas token. We are building StudyPilot, a paid, student-facing study planner (see
`docs/design/0001-studypilot-design.md`).

## Decisions
1. **Replace the prototype entirely.** The Electron code was deleted in a normal commit; git history keeps it.
   The Canvas token that was committed in `src/canvasAPI.js` must be revoked by its owner. Deleting the
   file doesn't remove it from history.
2. **Responsive web app (PWA later), not Electron.** Next.js (App Router) + TypeScript + Tailwind.
3. **Modular monolith.** One Next.js app plus (from M3) one worker process sharing the codebase and Postgres.
   pg-boss for jobs, so there's no Redis.
4. **Scheduling engine is pure TypeScript** in `src/scheduler/`. It has no I/O, uses an injected `Clock`,
   produces deterministic output, and imports nothing from Next.js or the database.
5. **Time model.** Instants are UTC; recurring rules are wall-clock `HH:mm` in the student's IANA zone,
   expanded with Luxon. DST is covered by tests.
6. **Business model: sold directly to students.** We are not a school official under FERPA unless we later
   sign institutional agreements. The product must work fully without institutional Canvas approval.
7. **Canvas access during development** uses only the developer's own account (personal token in
   `.env.local`, read-only GET requests). Third parties' tokens are never collected or used. Production
   uses per-institution OAuth where approved, plus the Canvas calendar feed (ICS) and manual entry.
8. **Hosting target: Render** (web service + background worker + managed Postgres with pgvector) for launch.
   Re-evaluate at scale. Docker Compose for local development.
9. **LLM provider: Anthropic Claude** behind an `LLMProvider` interface (Phase 2), with a fake provider for tests.
10. **Tutor answer policy.** Final answers are shown only for StudyPilot's own AI-generated practice items
    after the student submits; never for imported coursework.

## Scheduler algorithm as implemented in M1
- Work items are split into near-equal units of at most the preferred session length (5-minute grid).
  Milestones are ordered, and exam review is spaced (D-7/-4/-2/-1).
- Units are processed earliest-deadline-first (ties: priority, then ids). Each is placed in the
  best-scoring free slot. The score favours earlier starts, with a steep penalty for the last 30% of the
  window. It also weighs energy match × difficulty, spreading the same course or item across days, and
  daily load. For ordered chains it prefers slots that leave enough room for the remaining steps.
- Units that don't fit in one slot are split. A unit that can't fit before the buffered deadline is
  retried against the real due time and flagged `bufferReduced`. Anything still unplaced is reported as a
  **shortfall** and never scheduled after its deadline.
- **Minimal churn:** the "stable" pass first keeps the student's existing future sessions in place
  (filled with the remaining work in order) where still valid. It falls back to a fresh plan, and then to
  pure earliest-deadline placement, only if those schedule strictly more work, with a warning.
- The design document described an exact feasibility test before placement. M1 instead reports
  shortfalls from actual placement, plus an upper-bound capacity figure. This never overstates what fits,
  but may under-schedule in rare tight cases a smarter solver could solve. Revisit if real data shows it.

## Consequences
- The engine is fast (~25 ms for the demo student), explainable and testable with property tests.
- The greedy approach is not optimal; it's covered by invariant tests, and an exact solver can be swapped
  in behind `plan()` later.
