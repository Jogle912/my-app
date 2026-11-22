/**
 * Prints a study plan for the mock student. Usage:
 *   npm run plan:demo
 *   npm run plan:demo -- --miss 2     # simulate missing the first 2 sessions, then replan
 */
import { DateTime } from "luxon";
import { demoStudent, plan, SimulatedClock, type PlanResult } from "@studypilot/scheduler";

const missIdx = process.argv.indexOf("--miss");
const miss = missIdx > -1 ? Number(process.argv[missIdx + 1] ?? 1) : 0;

const clock = new SimulatedClock(new Date().toISOString());
const input = demoStudent(clock.now());
const names = new Map(input.courses.map((c) => [c.id, c.name.split(" ").slice(0, 2).join(" ")]));
const fmt = (iso: string) => DateTime.fromISO(iso, { zone: input.timeZone });

function print(r: PlanResult, heading: string): void {
  console.log(`\n=== ${heading} (strategy: ${r.strategy}) ===`);
  let day = "";
  for (const s of r.sessions) {
    const d = fmt(s.start).toFormat("cccc LLL d");
    if (d !== day) console.log(`\n${(day = d)}`);
    const flags = [s.locked ? "locked" : "", s.bufferReduced ? "inside buffer" : ""].filter(Boolean).join(", ");
    console.log(`  ${fmt(s.start).toFormat("HH:mm")}–${fmt(s.end).toFormat("HH:mm")}  ${(names.get(s.courseId) ?? "").padEnd(10)} ${s.title} (${s.minutes}m)${flags ? ` [${flags}]` : ""}`);
  }
  const c = r.capacity;
  console.log(`\nWork: ${c.demandMinutes} min · scheduled: ${c.scheduledMinutes} min · free capacity: ${c.availableMinutes} min`);
  for (const s of r.shortfalls) console.log(`! SHORTFALL ${s.explanation}`);
  for (const w of r.warnings) console.log(`! ${w.code}: ${w.message}`);
  if (r.changes.length) {
    console.log("\nWhat changed:");
    for (const ch of r.changes) console.log(`  - ${ch.explanation}`);
  }
}

const t0 = performance.now();
const first = plan(input, clock);
const ms = (performance.now() - t0).toFixed(1);
print(first, `Initial plan (${ms} ms)`);

if (miss > 0) {
  const missed = first.sessions.filter((s) => !s.locked).slice(0, miss);
  clock.set(new Date(Date.parse(missed[missed.length - 1].end) + 60_000).toISOString());
  const existing = first.sessions.map((s) => ({ id: s.key, itemId: s.itemId, start: s.start, end: s.end, locked: s.locked }));
  print(plan({ ...input, existingSessions: existing }, clock), `After missing ${miss} session(s)`);
}
