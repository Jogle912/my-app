import { DateTime } from "luxon";
import Link from "next/link";
import type { PlannedSession, PlanResult } from "@studypilot/scheduler";

const PALETTE = ["border-l-indigo-500", "border-l-emerald-500", "border-l-amber-500", "border-l-rose-500", "border-l-sky-500", "border-l-violet-500"];

/** Stable colour per course (hash of the id), so colours don't shift between renders. */
function courseColor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function PlanView({
  result,
  timeZone,
  courseNames,
  linkItems = false,
}: {
  result: PlanResult;
  timeZone: string;
  courseNames: Map<string, string>;
  linkItems?: boolean;
}) {
  const byDay = new Map<string, PlannedSession[]>();
  for (const s of result.sessions) {
    const day = DateTime.fromISO(s.start, { zone: timeZone }).toFormat("cccc, LLLL d");
    byDay.set(day, [...(byDay.get(day) ?? []), s]);
  }
  const time = (iso: string) => DateTime.fromISO(iso, { zone: timeZone }).toFormat("h:mm a");
  const { demandMinutes, scheduledMinutes, availableMinutes } = result.capacity;
  const hours = (m: number) => `${(m / 60).toFixed(1)} h`;

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            ["Work to plan", demandMinutes],
            ["Scheduled", scheduledMinutes],
            ["Free study capacity", availableMinutes],
          ] as const
        ).map(([label, mins]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
            <dd className="text-2xl font-semibold">{hours(mins)}</dd>
          </div>
        ))}
      </dl>

      {(result.shortfalls.length > 0 || result.warnings.length > 0) && (
        <section
          aria-labelledby="plan-alerts"
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        >
          <h2 id="plan-alerts" className="font-semibold">
            Heads up
          </h2>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {result.shortfalls.map((s) => (
              <li key={s.itemId}>{s.explanation}</li>
            ))}
            {result.warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </section>
      )}

      {byDay.size === 0 && <p className="text-slate-600 dark:text-slate-300">Nothing to schedule yet.</p>}

      {[...byDay].map(([day, sessions]) => (
        <section key={day} aria-label={day}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{day}</h2>
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => (
              <li
                key={s.key}
                className={`rounded-md border border-l-4 border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 ${courseColor(s.courseId)}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  {linkItems && s.itemId ? (
                    <Link href={`/assignments/${s.itemId}`} className="font-medium hover:underline">
                      {s.title}
                    </Link>
                  ) : (
                    <span className="font-medium">{s.title}</span>
                  )}
                  <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
                    {time(s.start)} – {time(s.end)} · {s.minutes} min
                  </span>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {courseNames.get(s.courseId)}
                  {s.locked && " · locked"}
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
