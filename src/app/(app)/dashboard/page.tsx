import { DateTime } from "luxon";
import Link from "next/link";
import { Suspense } from "react";
import { formatLocal } from "@/lib/localTime";
import { systemClock } from "@/scheduler";
import { listUpcomingAssignments } from "@/server/access/assignments";
import { listCourses } from "@/server/access/courses";
import { planForStudent } from "@/server/access/planning";
import { requireUser } from "@/server/access/session";
import { Card, Loading, PageHeader } from "../ui";

export const metadata = { title: "Today · StudyPilot" };

async function Today() {
  const user = await requireUser();
  const now = systemClock.now();
  const [courses, upcoming, { result, timeZone, hasAvailability }] = await Promise.all([
    listCourses(user.id),
    listUpcomingAssignments(user.id, now),
    planForStudent(user.id, systemClock),
  ]);
  const todayKey = DateTime.fromJSDate(now, { zone: timeZone }).toISODate();
  const today = result.sessions.filter((s) => DateTime.fromISO(s.start, { zone: timeZone }).toISODate() === todayKey);
  const soon = upcoming.filter((a) => a.dueAt.getTime() - now.getTime() < 7 * 86_400_000 && !a.studentDone);

  if (courses.length === 0 || !hasAvailability) {
    return (
      <Card title="Let's set up your week">
        <ol className="list-decimal space-y-2 pl-5">
          <li className={hasAvailability ? "text-slate-400 line-through" : ""}>
            <Link href="/settings/schedule" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Tell us when you can study
            </Link>
          </li>
          <li className={courses.length ? "text-slate-400 line-through" : ""}>
            <Link href="/courses" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Add your courses and assignments
            </Link>
          </li>
        </ol>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card title="Study today">
        {today.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-300">Nothing scheduled for the rest of today.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {today.map((s) => (
              <li key={s.key} className="flex justify-between gap-2 text-sm">
                <Link href={`/assignments/${s.itemId}`} className="font-medium hover:underline">
                  {s.title}
                </Link>
                <span className="tabular-nums text-slate-500">
                  {formatLocal(s.start, timeZone, "h:mm a")} · {s.minutes} min
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/plan" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          See the full plan →
        </Link>
      </Card>
      <Card title="Due in the next 7 days">
        {soon.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-300">Nothing due this week.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {soon.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 text-sm">
                <Link href={`/assignments/${a.id}`} className="font-medium hover:underline">
                  {a.title}
                </Link>
                <span className="text-slate-500">
                  {a.course.name} · {formatLocal(a.dueAt, timeZone)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {result.shortfalls.length > 0 && (
        <div className="md:col-span-2">
          <Card title="Not enough time">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {result.shortfalls.map((s) => (
                <li key={s.itemId}>{s.explanation}</li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Today" />
      <Suspense fallback={<Loading />}>
        <Today />
      </Suspense>
    </>
  );
}
