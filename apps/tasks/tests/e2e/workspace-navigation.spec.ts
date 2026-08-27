import { expect, test, type Page } from "@playwright/test";
import {
  DEMO_PREVIEW_COOKIE,
  DEMO_PREVIEW_VALUE,
} from "../../lib/demo-preview";

/**
 * The workspace redirects anyone without a session to /login, and the Supabase
 * double the suite runs against cannot mint one. Demo preview is the app's own
 * way to render the workspace from fixtures instead of the database, so these
 * specs enter through it: the chrome, the routing, and the drawer are the same
 * components either way, and the fixtures make the page content predictable.
 */
async function enterDemoWorkspace(page: Page, baseURL: string | undefined) {
  await page.context().addCookies([
    {
      name: DEMO_PREVIEW_COOKIE,
      value: DEMO_PREVIEW_VALUE,
      url: baseURL ?? "http://127.0.0.1:3100",
    },
  ]);
  await page.goto("/");
}

test("workspace chrome persists across page navigation", async ({
  page,
  baseURL,
}) => {
  await enterDemoWorkspace(page, baseURL);

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
    baseURL,
  }) => {
    await enterDemoWorkspace(page, baseURL);
    await expect(page.locator("[data-workspace-shell]")).toHaveCount(1);
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
