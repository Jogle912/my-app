import Link from "next/link";
import { Suspense } from "react";
import { PlanView } from "@/components/PlanView";
import { systemClock } from "@studypilot/scheduler";
import { planForStudent } from "@/server/access/planning";
import { requireUser } from "@/server/access/session";
import { Loading, PageHeader } from "../ui";

export const metadata = { title: "Plan · StudyPilot" };

async function StudentPlan() {
  const user = await requireUser();
  const { result, timeZone, courseNames, hasAvailability } = await planForStudent(user.id, systemClock);
  return (
    <>
      {!hasAvailability && (
        <p className="mb-6 rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-100">
          You haven&apos;t told us when you can study yet.{" "}
          <Link href="/settings/schedule" className="font-medium underline">
            Set your weekly availability
          </Link>
          .
        </p>
      )}
      <PlanView result={result} timeZone={timeZone} courseNames={courseNames} linkItems />
    </>
  );
}

export default function PlanPage() {
  return (
    <>
      <PageHeader title="Your study plan">
        Built from your courses, deadlines and availability. It updates whenever they change.
      </PageHeader>
      <Suspense fallback={<Loading />}>
        <StudentPlan />
      </Suspense>
    </>
  );
}
