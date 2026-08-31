import { expect, test, type Page } from "@playwright/test";
import {
  DEMO_PREVIEW_COOKIE,
  DEMO_PREVIEW_VALUE,
} from "../../lib/demo-preview";

// These workflows all render the full demo workspace. Keeping them serial
// avoids three simultaneous cold hydrations obscuring the transition each test
// is meant to exercise.
test.describe.configure({ mode: "serial" });

async function enterDemoWorkspace(page: Page, baseURL: string | undefined) {
  await page.context().addCookies([
    {
      name: DEMO_PREVIEW_COOKIE,
      value: DEMO_PREVIEW_VALUE,
      url: baseURL ?? "http://127.0.0.1:3100",
    },
  ]);
}

test("keeps stale board results inert while a search is pending", async ({
  page,
  baseURL,
}) => {
  await enterDemoWorkspace(page, baseURL);
  await page.goto("/board");
  await page.waitForLoadState("networkidle");

  const search = page.getByRole("searchbox", {
    name: "Search In Progress tasks",
  });
  const column = search.locator("../..");
  await expect(column.getByText("Confirm launch venue")).toBeVisible();

  await search.fill("nothing matches this task");
  expect(await search.getAttribute("aria-busy")).toBe("true");
  await expect(
    page.getByLabel("Filtering In Progress tasks"),
  ).toBeVisible();
  await expect(column).toHaveAttribute("aria-busy", "true");
  await expect(column.getByText("Confirm launch venue")).toBeVisible();
  await expect(column.getByText("Confirm launch venue").locator(".."))
    .toHaveCSS("pointer-events", "none");

  await expect(search).toHaveAttribute("aria-busy", "false");
  await expect(
    column.getByText("No In Progress tasks match this search."),
  ).toBeVisible();
});

test("updates category owners through the resource editor", async ({
  page,
  baseURL,
}) => {
  await enterDemoWorkspace(page, baseURL);
  await page.goto("/categories");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: 'Edit “Operations”' }).click();
  const editor = page.getByRole("dialog", { name: "Edit Operations" });
  await expect(
    editor.getByRole("heading", { name: "Edit Operations" }),
  ).toBeVisible();

  const owners = editor.getByRole("button", { name: /Category owners/ });
  await owners.click();
  await page.getByRole("option", { name: "Alex Morgan" }).click();
  await owners.click();
  const save = page.getByRole("button", { name: "Save changes", exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(
    page.getByRole("heading", { name: "Edit Operations" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: 'Edit “Operations”' }).click();
  const reopened = page.getByRole("dialog", { name: "Edit Operations" });
  await expect(
    reopened.getByRole("button", { name: /Category owners/ }),
  ).toContainText("Alex Morgan");
});

test("saves and deletes a calendar item", async ({ page, baseURL }) => {
  await enterDemoWorkspace(page, baseURL);
  await page.goto("/calendar");
  await page.waitForLoadState("networkidle");

  const title = `Coverage checkpoint ${Date.now()}`;
  await page.getByRole("button", { name: "Add date" }).click();
  const createDialog = page.getByRole("dialog", {
    name: "Add important date",
  });
  await createDialog.getByLabel("Title").fill(title);
  await createDialog.getByRole("button", { name: "Save" }).click();
  await expect(createDialog).toBeHidden();
  const calendarItem = page
    .getByLabel("Calendar details")
    .getByRole("button", { name: title, exact: true });
  await expect(calendarItem).toBeVisible();

  await calendarItem.click();
  const editDialog = page.getByRole("dialog", {
    name: "Edit important date",
  });
  await editDialog.getByRole("button", { name: "Delete" }).click();
  await expect(editDialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: title, exact: true }),
  ).toHaveCount(0);
});
