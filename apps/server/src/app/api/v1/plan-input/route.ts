import { loadStudentRecords } from "@/server/access/planning";
import { apiRoute } from "@/server/api";
import { toPlanInput } from "@/server/planning/toPlanInput";

/**
 * Everything the app needs to run the scheduling engine on the device: the student's records,
 * already mapped to engine input. Planning on-device keeps the plan available offline.
 */
export const GET = apiRoute(async ({ user }) => {
  const records = await loadStudentRecords(user.id, new Date());
  return {
    input: toPlanInput(records),
    courseNames: Object.fromEntries(records.courses.map((c) => [c.id, c.name])),
  };
});
