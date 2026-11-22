import { expect, test } from "@playwright/test";

test("landing page links to a working demo plan", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("plan you can actually follow");
  await page.getByRole("link", { name: "Try with demo data" }).click();
  await expect(page.getByRole("heading", { name: "Demo study plan" })).toBeVisible();
  // The plan renders at least one scheduled session with a time range.
  await expect(page.getByRole("listitem").filter({ hasText: /\d{1,2}:\d{2} [AP]M – / }).first()).toBeVisible();
  await expect(page.getByText("Scheduled")).toBeVisible();
});
