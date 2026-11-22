import { expect, type Page, test } from "@playwright/test";

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function signUp(page: Page, name: string) {
  const email = `${name.toLowerCase()}-${unique()}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/settings\/schedule/);
  return email;
}

/** A local datetime-local value `days` from now at 23:59. */
function inDays(days: number) {
  const d = new Date(Date.now() + days * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`;
}

test("a student can set up their week, add coursework and get a plan", async ({ page }) => {
  await signUp(page, "Ana");
  await expect(page.getByText("Welcome!")).toBeVisible();

  // Study every evening.
  const study = page.getByRole("form", { name: "Add study time" });
  for (const d of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) await study.getByLabel(d).check();
  await study.getByLabel("From").fill("18:00");
  await study.getByLabel("To").fill("22:00");
  await study.getByRole("button", { name: "Add study time" }).click();
  await expect(page.getByText("Mon, Tue, Wed, Thu, Fri, Sat, Sun · 18:00–22:00")).toBeVisible();

  // Add a course.
  await page.getByRole("link", { name: "Courses" }).click();
  const addCourse = page.getByRole("form", { name: "Add a course" });
  await addCourse.getByLabel("Course name").fill("Calculus I");
  await addCourse.getByRole("button", { name: "Add course" }).click();
  await page.getByRole("link", { name: /Calculus I/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Calculus I" })).toBeVisible();

  // Add an assignment due in 4 days.
  const addA = page.getByRole("form", { name: "Add an assignment" });
  await addA.getByLabel("Title").fill("Problem Set 7");
  await addA.getByLabel("Due (or exam start)").fill(inDays(4));
  await addA.getByLabel("Estimated minutes").fill("120");
  await addA.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("link", { name: "Problem Set 7" })).toBeVisible();

  // The plan schedules all 2 hours.
  await page.getByRole("link", { name: "Plan", exact: true }).click();
  await expect(page.getByRole("link", { name: "Problem Set 7" }).first()).toBeVisible();
  await expect(page.getByText("Scheduled").locator("..").getByText("2.0 h")).toBeVisible();

  // Signing out locks the app again.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await page.goto("/plan");
  await expect(page).toHaveURL(/\/signin/);
});

test("validation errors are shown instead of saving bad data", async ({ page }) => {
  await signUp(page, "Val");
  const study = page.getByRole("form", { name: "Add study time" });
  await study.getByLabel("From").fill("18:00");
  await study.getByLabel("To").fill("20:00");
  await study.getByRole("button", { name: "Add study time" }).click(); // no days picked
  await expect(study.getByRole("alert")).toContainText("Pick at least one day");
});

test("a student cannot open another student's course", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const a = await ctxA.newPage();
  await signUp(a, "Owner");
  await a.goto("/courses");
  await a.getByRole("form", { name: "Add a course" }).getByLabel("Course name").fill("Private Seminar");
  await a.getByRole("button", { name: "Add course" }).click();
  await a.getByRole("link", { name: /Private Seminar/ }).click();
  await expect(a.getByRole("heading", { level: 1, name: "Private Seminar" })).toBeVisible();
  const courseUrl = a.url();

  const ctxB = await browser.newContext();
  const b = await ctxB.newPage();
  await signUp(b, "Intruder");
  await b.goto(courseUrl);
  await expect(b.getByText("Private Seminar")).toHaveCount(0);
  await expect(b.getByText(/not found|could not be found/i).first()).toBeVisible();
  await ctxA.close();
  await ctxB.close();
});
