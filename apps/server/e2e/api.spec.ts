import { type APIRequestContext, expect, request as pwRequest, test } from "@playwright/test";

// API tests only need one browser profile.
test.skip(({ browserName, isMobile }) => browserName !== "chromium" || !!isMobile, "API tests run once");

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** An API client signed in as a fresh student, the way the mobile app is (session cookie). */
async function student(baseURL: string, name: string): Promise<APIRequestContext> {
  const ctx = await pwRequest.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  const res = await ctx.post("/api/auth/sign-up/email", {
    data: { name, email: `${name.toLowerCase()}-${unique()}@example.test`, password: "correct-horse-battery" },
  });
  expect(res.ok(), await res.text()).toBe(true);
  return ctx;
}

const isoInDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

test("mobile API: full round trip from sign-up to plan input", async ({ baseURL }) => {
  const api = await student(baseURL!, "Mia");
  expect((await (await api.get("/api/v1/me")).json()).user.name).toBe("Mia");

  const course = (await (await api.post("/api/v1/courses", { data: { name: "Chemistry", difficulty: 4 } })).json()).course;
  expect(course).toMatchObject({ name: "Chemistry", difficulty: 4 });

  const meeting = await api.post(`/api/v1/courses/${course.id}/meetings`, { data: { days: [1, 3], startTime: "10:00", endTime: "10:50" } });
  expect(meeting.status()).toBe(200);

  const created = await api.post("/api/v1/assignments", {
    data: { courseId: course.id, title: "Lab 3", kind: "HOMEWORK", dueAt: isoInDays(5), estimatedMinutes: 90 },
  });
  expect(created.status(), await created.text()).toBe(200);
  const assignment = (await created.json()).assignment;

  const step = await api.post(`/api/v1/assignments/${assignment.id}/milestones`, { data: { title: "Write up", estimatedMinutes: 45 } });
  expect(step.status()).toBe(200);
  const milestoneId = (await step.json()).milestone.id;
  expect((await api.patch(`/api/v1/milestones/${milestoneId}`, { data: { done: true } })).status()).toBe(200);

  expect((await api.post("/api/v1/availability", { data: { kind: "AVAILABLE", days: [1, 2, 3, 4, 5, 6, 7], startTime: "18:00", endTime: "22:00" } })).status()).toBe(200);
  const prefs = (await (await api.get("/api/v1/preferences")).json()).preferences;
  const put = await api.put("/api/v1/preferences", { data: { ...prefs, timeZone: "America/New_York", maxStudyMinutesPerDay: 180 } });
  expect(put.status(), await put.text()).toBe(200);

  const { input, courseNames } = await (await api.get("/api/v1/plan-input")).json();
  expect(input.timeZone).toBe("America/New_York");
  expect(input.items.map((i: { id: string }) => i.id)).toEqual([assignment.id]);
  expect(input.items[0].milestones[0]).toMatchObject({ completedMinutes: 45 });
  expect(input.availability).toHaveLength(1);
  expect(courseNames[course.id]).toBe("Chemistry");

  expect((await api.delete(`/api/v1/assignments/${assignment.id}`)).status()).toBe(200);
  expect((await api.get(`/api/v1/assignments/${assignment.id}`)).status()).toBe(404);
});

test("mobile API: one student can never see or change another's records", async ({ baseURL }) => {
  const owner = await student(baseURL!, "Owner");
  const other = await student(baseURL!, "Other");
  const course = (await (await owner.post("/api/v1/courses", { data: { name: "Private" } })).json()).course;
  const assignment = (await (await owner.post("/api/v1/assignments", { data: { courseId: course.id, title: "Secret", dueAt: isoInDays(3) } })).json()).assignment;

  expect((await other.get(`/api/v1/courses/${course.id}`)).status()).toBe(404);
  expect((await other.patch(`/api/v1/courses/${course.id}`, { data: { name: "Hacked" } })).status()).toBe(404);
  expect((await other.delete(`/api/v1/courses/${course.id}`)).status()).toBe(404);
  expect((await other.post("/api/v1/assignments", { data: { courseId: course.id, title: "x", dueAt: isoInDays(1) } })).status()).toBe(404);
  expect((await other.get(`/api/v1/assignments/${assignment.id}`)).status()).toBe(404);
  expect((await other.patch(`/api/v1/assignments/${assignment.id}/progress`, { data: { studentDone: true } })).status()).toBe(404);
  expect((await (await other.get("/api/v1/courses")).json()).courses).toEqual([]);
  expect(JSON.stringify(await (await other.get("/api/v1/plan-input")).json())).not.toContain("Secret");
  expect((await (await owner.get(`/api/v1/courses/${course.id}`)).json()).course.name).toBe("Private");
});

test("mobile API: rejects missing sessions, bad input and non-JSON writes", async ({ baseURL }) => {
  const anon = await pwRequest.newContext({ baseURL });
  expect((await anon.get("/api/v1/plan-input")).status()).toBe(401);
  expect((await anon.post("/api/v1/courses", { data: { name: "x" } })).status()).toBe(401);

  const api = await student(baseURL!, "Val");
  const bad = await api.post("/api/v1/courses", { data: { name: "" } });
  expect(bad.status()).toBe(400);
  expect((await bad.json()).issues[0]).toMatchObject({ path: "name" });
  const formPost = await api.post("/api/v1/courses", { headers: { "Content-Type": "text/plain" }, data: '{"name":"csrf"}' });
  expect(formPost.status()).toBe(415);
  expect((await (await api.get("/api/v1/courses")).json()).courses).toEqual([]);
});
