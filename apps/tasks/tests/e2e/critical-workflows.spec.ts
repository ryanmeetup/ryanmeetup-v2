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

test("keeps category tags subordinate across task surfaces", async ({
  page,
  baseURL,
}) => {
  await enterDemoWorkspace(page, baseURL);
  await page.goto("/board");
  await page.waitForLoadState("networkidle");

  const categoryBadge = page.getByLabel(
    "Product / Tools category; tags: Bug",
    { exact: true },
  );
  await expect(categoryBadge).toContainText("Product / Tools· +1");
  await expect(categoryBadge.getByText("Bug", { exact: true }))
    .toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });

  await page
    .getByRole("link", {
      name: "Go to Fix confirmation email copy details",
      exact: true,
    })
    .click();
  await page.waitForLoadState("networkidle");

  const categoriesSection = page
    .getByRole("main")
    .getByText("Categories", { exact: true })
    .locator("..");
  await expect(
    categoriesSection.getByText("Product / Tools", { exact: true }),
  ).toBeVisible();
  await expect(
    categoriesSection.getByText("Bug", { exact: true }),
  ).toBeVisible();
});

test("preserves existing assignees when another person is added", async ({
  page,
  baseURL,
}) => {
  await enterDemoWorkspace(page, baseURL);
  await page.goto("/board");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Open Confirm launch venue" }).click();
  const assignees = page.getByRole("button", { name: "Assignees" });
  await expect(assignees).toContainText("Taylor Brooks, Alex Morgan");
  await assignees.click();
  await page.getByRole("option", { name: "Jordan Lee" }).click();
  await assignees.click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "Edit Task" })).toHaveCount(0);

  await page.getByRole("button", { name: "Open Confirm launch venue" }).click();
  await expect(
    page.getByRole("button", { name: "Assignees" }),
  ).toContainText("Taylor Brooks, Alex Morgan +1");
});

test("shows shared assignments in My Tasks", async ({ page, baseURL }) => {
  await enterDemoWorkspace(page, baseURL);
  await page.goto("/board");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Mine" }).click();
  await expect(
    page.getByRole("button", { name: "Open Confirm launch venue" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Publish onboarding checklist" }),
  ).toHaveCount(0);
});

test("returns to the task after saving from the mobile editor", async ({
  page,
  baseURL,
}) => {
  await enterDemoWorkspace(page, baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/task/RMT-5/edit?from=%2Ftask%2FRMT-5");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/task\/RMT-5$/);
  await expect(
    page.getByRole("heading", { name: "Confirm launch venue" }),
  ).toBeVisible();
});

test("keeps the mobile duplicate editor open for create another", async ({
  page,
  baseURL,
}) => {
  await enterDemoWorkspace(page, baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/task/RMT-5/edit?from=%2Ftask%2FRMT-5");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Duplicate task" }).click();
  await page.getByRole("checkbox", { name: "Create another" }).check();
  await page.getByRole("button", { name: "Create task" }).click();

  await expect(page).toHaveURL(/\/task\/RMT-5\/edit/);
  await expect(
    page.getByRole("heading", { name: "A new thing to do" }),
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
  await page.getByRole("button", { name: "Add to calendar" }).click();
  const createDialog = page.getByRole("dialog", {
    name: "Add to calendar",
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

test("requires a reason before a task can be declined", async ({
  page,
  baseURL,
}) => {
  await enterDemoWorkspace(page, baseURL);
  await page.goto("/board");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Open Confirm launch venue" }).click();
  await expect(page.getByRole("heading", { name: "Edit Task" })).toBeVisible();

  const reason = page.getByLabel(/Why is this task moving to Will Not Do/);
  await expect(reason).toHaveCount(0);

  await page.getByRole("button", { name: /^Status/ }).click();
  await page.getByRole("option", { name: "Will Not Do" }).click();
  await expect(reason).toBeVisible();

  // An empty reason is caught by the field itself, whitespace by the editor.
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "Edit Task" })).toBeVisible();

  await reason.fill("   ");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page
      .getByRole("status")
      .getByText("Add a reason before moving this task to Will Not Do."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Edit Task" })).toBeVisible();

  await reason.fill("The venue doubled its rate.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "Edit Task" })).toHaveCount(0);

  // The reason is kept as a comment, and the task now sits in the status, so
  // editing it again does not ask for another one.
  await page
    .getByRole("link", { name: "Go to Confirm launch venue details" })
    .click();
  await expect(page.getByText("The venue doubled its rate.")).toBeVisible();
  await page.getByRole("button", { name: "Edit task" }).first().click();
  await expect(page.getByRole("heading", { name: "Edit Task" })).toBeVisible();
  await expect(reason).toHaveCount(0);
});
