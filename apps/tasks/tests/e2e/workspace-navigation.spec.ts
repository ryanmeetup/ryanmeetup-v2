import { expect, test } from "@playwright/test";

test("workspace chrome persists across page navigation", async ({ page }) => {
  await page.goto("/");

  const shell = page.locator("[data-workspace-shell]");
  const sidebar = page.locator("[data-workspace-sidebar]");
  await expect(shell).toHaveCount(1);
  await expect(sidebar).toBeVisible();
  await page.evaluate(() => {
    Object.assign(window, {
      workspaceShellBeforeNavigation: document.querySelector(
        "[data-workspace-shell]",
      ),
    });
  });

  await sidebar.getByRole("link", { name: "Notes" }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(
    page.getByRole("heading", { level: 1 }).filter({ hasText: "Notes" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        Reflect.get(window, "workspaceShellBeforeNavigation") ===
        document.querySelector("[data-workspace-shell]"),
    ),
  ).toBe(true);
  await expect(sidebar).toBeVisible();
  await expect(page.locator("[data-workspace-content-loading]")).toHaveCount(0);
});

test.describe("mobile workspace navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the workspace shell mounted after using the drawer", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      Object.assign(window, {
        mobileWorkspaceShellBeforeNavigation: document.querySelector(
          "[data-workspace-shell]",
        ),
      });
    });

    await page.getByRole("button", { name: "Open navigation" }).click();
    const drawer = page.getByRole("dialog");
    await expect(
      drawer.getByRole("button", { name: "Close navigation" }),
    ).toBeVisible();
    await drawer.getByRole("link", { name: "Notes" }).click();

    await expect(page).toHaveURL(/\/notes$/);
    expect(
      await page.evaluate(
        () =>
          Reflect.get(window, "mobileWorkspaceShellBeforeNavigation") ===
          document.querySelector("[data-workspace-shell]"),
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeVisible();
  });
});
