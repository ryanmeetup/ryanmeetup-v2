import { expect, test, type Page } from "@playwright/test";
import {
  DEMO_PREVIEW_COOKIE,
  DEMO_PREVIEW_VALUE,
} from "../../lib/demo-preview";

async function openDemoCalendar(page: Page, baseURL: string | undefined) {
  await page.context().addCookies([
    {
      name: DEMO_PREVIEW_COOKIE,
      value: DEMO_PREVIEW_VALUE,
      url: baseURL ?? "http://127.0.0.1:3100",
    },
  ]);
  await page.goto("/calendar");
}

test("opens the important-date editor from the calendar", async ({
  page,
  baseURL,
}) => {
  await openDemoCalendar(page, baseURL);

  await expect(page.locator("[data-calendar-month-grid]")).toBeVisible();
  await page.getByRole("button", { name: "Add date", exact: true }).click();

  const editor = page.getByRole("dialog", { name: "Add important date" });
  await expect(
    editor.getByRole("heading", { name: "Add important date" }),
  ).toBeVisible();
  await expect(editor.getByLabel("Title")).toBeVisible();
  await expect(editor.getByLabel("Start date")).toBeVisible();
  await expect(editor.getByLabel("End date")).toBeVisible();
  await expect(editor.getByRole("checkbox", { name: "All day" })).toBeChecked();
});

test.describe("mobile calendar", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("uses the agenda presentation instead of the month grid", async ({
    page,
    baseURL,
  }) => {
    await openDemoCalendar(page, baseURL);

    await expect(page.locator("[data-calendar-month-grid]")).toBeHidden();
    await expect(page.locator("[data-calendar-mobile-agenda]")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add date", exact: true }),
    ).toBeVisible();
  });
});
