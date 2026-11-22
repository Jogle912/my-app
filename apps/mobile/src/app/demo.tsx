import { demoStudent, plan, systemClock } from "@studypilot/scheduler";
import { useMemo } from "react";
import { PlanList } from "@/components/PlanList";
import { Body, Screen } from "@/components/ui";

/** A sample plan computed entirely on the phone. No account or network needed. */
export default function Demo() {
  const { result, timeZone, courseNames } = useMemo(() => {
    const input = demoStudent(systemClock.now());
    return {
      result: plan(input, systemClock),
      timeZone: input.timeZone,
      courseNames: Object.fromEntries(input.courses.map((c) => [c.id, c.name])),
    };
  }, []);
  return (
    <Screen>
      <Body muted>A sample student with three courses, a campus job and a midterm. Planned on your phone by StudyPilot&apos;s scheduler.</Body>
      <PlanList result={result} timeZone={timeZone} courseNames={courseNames} />
    </Screen>
  );
}
