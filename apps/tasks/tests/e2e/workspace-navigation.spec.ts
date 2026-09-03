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

test("aligns board column searches across description lengths", async ({
  page,
  baseURL,
}) => {
  await enterDemoWorkspace(page, baseURL);
  await page.goto("/board");

  const searches = page.locator(
    'section input[aria-label^="Search "][aria-label$=" tasks"]',
  );
  await expect(searches).toHaveCount(6);

  const topPositions = await searches.evaluateAll((inputs) =>
    inputs.map((input) => input.getBoundingClientRect().top),
  );
  expect(Math.max(...topPositions) - Math.min(...topPositions)).toBeLessThan(1);
});

test("keeps the board scroller next to the footer", async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await enterDemoWorkspace(page, baseURL);
  await page.goto("/board");

  const doneColumn = page.locator("section").filter({
    has: page.getByRole("heading", { level: 2, name: "Done" }),
  });
  const boardScroller = doneColumn.locator("..");
  const footer = page.locator(".tasks-footer");
  await expect(boardScroller).toBeVisible();
  await expect(footer).toBeVisible();

  const [boardBox, columnBox, footerBox] = await Promise.all([
    boardScroller.boundingBox(),
    doneColumn.boundingBox(),
    footer.boundingBox(),
  ]);
  expect(boardBox).not.toBeNull();
  expect(columnBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  const gap = footerBox!.y - (boardBox!.y + boardBox!.height);
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThanOrEqual(1);
  const columnInset = boardBox!.y + boardBox!.height -
    (columnBox!.y + columnBox!.height);
  expect(columnInset).toBeGreaterThanOrEqual(24);

  const columnBackground = await doneColumn.evaluate(
    (column) => getComputedStyle(column).backgroundColor,
  );
  expect(columnBackground).not.toMatch(/^rgba\(.+, 0\.\d+\)$/);
});

test("shrinks collapsed board columns to their header", async ({
  page,
  baseURL,
}) => {
  await enterDemoWorkspace(page, baseURL);
  await page.goto("/board");

  const doneColumn = page.locator("section").filter({
    has: page.getByRole("heading", { level: 2, name: "Done" }),
  });
  const inProgressColumn = page.locator("section").filter({
    has: page.getByRole("heading", { level: 2, name: "In Progress" }),
  });

  await doneColumn.getByRole("button", { name: 'Collapse “Done”' }).click();
  await expect(
    doneColumn.getByRole("button", { name: 'Expand “Done”' }),
  ).toBeVisible();

  await expect
    .poll(async () => (await doneColumn.boundingBox())?.height)
    .toBeLessThan(100);
  await expect
    .poll(async () => (await inProgressColumn.boundingBox())?.height)
    .toBeGreaterThan(400);
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
    await expect(
      page.getByRole("tooltip", { name: "Open navigation" }),
    ).not.toBeVisible();
  });
});
