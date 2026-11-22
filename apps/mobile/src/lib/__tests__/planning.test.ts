import { demoStudent, fixedClock, plan } from "@studypilot/scheduler";
import { groupByDay } from "../days";
import { formatDays, hours, isWallTime } from "../time";

describe("groupByDay", () => {
  it("groups the on-device plan by the student's local day and labels today/tomorrow", () => {
    const now = new Date("2026-11-23T14:00:00Z"); // Monday 08:00 in Chicago
    const input = demoStudent(now);
    const result = plan(input, fixedClock(now.toISOString()));
    const days = groupByDay(result, input.timeZone, now);
    expect(days.length).toBeGreaterThan(2);
    expect(days[0].title).toBe("Today");
    expect(days[1].title).toBe("Tomorrow");
    expect(days.flatMap((d) => d.data)).toHaveLength(result.sessions.length);
    for (let i = 1; i < days.length; i++) expect(days[i].key > days[i - 1].key).toBe(true);
  });
});

describe("time helpers", () => {
  it("formats days, validates wall times and prints durations", () => {
    expect(formatDays([1, 2, 3, 4, 5, 6, 7])).toBe("Every day");
    expect(formatDays([5, 1, 3])).toBe("Mon, Wed, Fri");
    expect(isWallTime("09:30")).toBe(true);
    expect(isWallTime("24:00")).toBe(false);
    expect(hours(45)).toBe("45 min");
    expect(hours(90)).toBe("1.5 h");
    expect(hours(120)).toBe("2 h");
  });
});
