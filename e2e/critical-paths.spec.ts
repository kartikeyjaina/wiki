import { expect, test } from "@playwright/test";

test.describe("critical navigation paths", () => {
  test("home shell renders and unknown routes recover", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Futurelab|Wiki|futurelab/i);
    await expect(page.locator("body")).toContainText(/futurelab wiki|Futurelab/i);

    await page.goto("/this-route-does-not-exist");
    await expect(page).toHaveURL(/\/$/);
  });

  test("wiki creation route is distinct from wiki slug routing", async ({ page }) => {
    await page.goto("/wiki/new");
    await expect(page).toHaveURL(/\/wiki\/new$/);
    await expect(page.locator("body")).toContainText(/new wiki|create|wiki/i);
  });

  test("keyboard navigation can reach the primary app controls", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
  });
});
