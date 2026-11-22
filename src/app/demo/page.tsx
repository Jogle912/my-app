import { connection } from "next/server";
import { Suspense } from "react";
import { PlanView } from "@/components/PlanView";
import { demoStudent } from "@/mock/demoStudent";
import { plan, systemClock } from "@/scheduler";

export const metadata = { title: "Demo plan · StudyPilot" };

async function DemoPlan() {
  await connection(); // the plan depends on the current time, so render per request
  const input = demoStudent(systemClock.now());
  return (
    <PlanView
      result={plan(input, systemClock)}
      timeZone={input.timeZone}
      courseNames={new Map(input.courses.map((c) => [c.id, c.name]))}
    />
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
