import { expect, test } from "@playwright/test";

test.describe("critical navigation paths", () => {
  test("home shell renders and unknown routes recover", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Futurelab Wiki");
    await expect(page.locator("main#main-content")).toBeVisible();

    await page.goto("/this-route-does-not-exist");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("main#main-content")).toBeVisible();
  });

  test("wiki creation route is distinct from wiki slug routing", async ({ page }) => {
    await page.goto("/wiki/new");
    await expect(page).toHaveURL(/\/wiki\/new$/);
    await expect(page.locator("body")).toContainText(/new wiki|create|wiki/i);
  });

  test("keyboard navigation reaches the skip link and primary controls", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main-content")).toBeFocused();

    await page.keyboard.press("Control+K");
    await expect(page.getByRole("dialog", { name: "Global search" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Search everything" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Global search" })).toBeHidden();
  });
});
