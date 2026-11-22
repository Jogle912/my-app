import { type PlanInput, plan, systemClock } from "@studypilot/scheduler";
import { useMemo } from "react";
import { useApi } from "./hooks";

/** Fetches the student's planning data and runs the scheduling engine on the device. */
export function useStudentPlan() {
  const q = useApi<{ input: PlanInput; courseNames: Record<string, string> }>("/api/v1/plan-input");
  const result = useMemo(() => (q.data ? plan(q.data.input, systemClock) : undefined), [q.data]);
  return { ...q, result, input: q.data?.input, courseNames: q.data?.courseNames ?? {} };
}
