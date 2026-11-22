import { DateTime } from "luxon";
import { connection } from "next/server";
import { Suspense } from "react";
import { demoStudent } from "@/mock/demoStudent";
import { plan, systemClock, type PlannedSession } from "@/scheduler";

export const metadata = { title: "Demo plan · StudyPilot" };

const COURSE_STYLES: Record<string, string> = {
  bio: "border-l-emerald-500",
  calc: "border-l-indigo-500",
  eng: "border-l-amber-500",
};

async function DemoPlan() {
  await connection(); // the plan depends on the current time, so render per request
  const input = demoStudent(systemClock.now());
  const result = plan(input, systemClock);
  const zone = input.timeZone;
  const courseName = new Map(input.courses.map((c) => [c.id, c.name]));

  const byDay = new Map<string, PlannedSession[]>();
  for (const s of result.sessions) {
    const day = DateTime.fromISO(s.start, { zone }).toFormat("cccc, LLLL d");
    byDay.set(day, [...(byDay.get(day) ?? []), s]);
  }
  const time = (iso: string) => DateTime.fromISO(iso, { zone }).toFormat("h:mm a");
  const { demandMinutes, scheduledMinutes, availableMinutes } = result.capacity;

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Work to plan", demandMinutes],
          ["Scheduled", scheduledMinutes],
          ["Free study capacity", availableMinutes],
        ].map(([label, mins]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
            <dd className="text-2xl font-semibold">{(Number(mins) / 60).toFixed(1)} h</dd>
          </div>
        ))}
      </dl>

      {(result.shortfalls.length > 0 || result.warnings.length > 0) && (
        <section aria-labelledby="alerts" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <h2 id="alerts" className="font-semibold">Heads up</h2>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {result.shortfalls.map((s) => <li key={s.itemId}>{s.explanation}</li>)}
            {result.warnings.map((w, i) => <li key={i}>{w.message}</li>)}
          </ul>
        </section>
      )}

      {[...byDay].map(([day, sessions]) => (
        <section key={day} aria-label={day}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{day}</h2>
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => (
              <li
                key={s.key}
                className={`rounded-md border border-l-4 border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 ${COURSE_STYLES[s.courseId] ?? "border-l-slate-400"}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{s.title}</span>
                  <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
                    {time(s.start)} – {time(s.end)} · {s.minutes} min
                  </span>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {courseName.get(s.courseId)}
                  {s.bufferReduced && " · uses part of your safety buffer"}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function DemoPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Demo study plan</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          A mock student with three courses, a campus job and a midterm, planned by the StudyPilot scheduling engine.
        </p>
      </header>
      <Suspense fallback={<p role="status">Building plan…</p>}>
        <DemoPlan />
      </Suspense>
    </div>
  );
}
