import { expect, test, type Page } from "@playwright/test";
import {
  DEMO_PREVIEW_COOKIE,
  DEMO_PREVIEW_VALUE,
} from "../../lib/demo-preview";

async function enterDemoWorkspace(page: Page, baseURL: string | undefined) {
  await page.context().addCookies([
    {
      name: DEMO_PREVIEW_COOKIE,
      value: DEMO_PREVIEW_VALUE,
      url: baseURL ?? "http://127.0.0.1:3100",
    },
  ]);
}

test("manages content visibility from the resource-first Access page", async ({
  page,
  baseURL,
}) => {
  await enterDemoWorkspace(page, baseURL);
  await page.goto("/admin/access");

  const content = page.getByRole("region", { name: "Content visibility" });
  await expect(content).toBeVisible();
  await expect(
    content.getByText(
      "Choose who can access each project and category without configuring every group separately.",
    ),
  ).toBeVisible();

  const project = content
    .getByRole("listitem")
    .filter({ hasText: "Website Refresh" });
  await project.getByRole("button", { name: "Everyone" }).click();
  await expect(page.getByText("Who can access this?", { exact: true })).toBeVisible();
  await expect(page.getByText("Project owners only", { exact: true })).toBeVisible();
  await expect(page.getByText("Selected access groups", { exact: true })).toBeVisible();
});

test.describe("mobile content visibility", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps visibility rows and menus inside the viewport", async ({
    page,
    baseURL,
  }) => {
    await enterDemoWorkspace(page, baseURL);
    await page.goto("/admin/access");

    const content = page.getByRole("region", { name: "Content visibility" });
    await expect(content).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    const project = content
      .getByRole("listitem")
      .filter({ hasText: "Website Refresh" });
    await project.getByRole("button", { name: "Everyone" }).click();
    await expect(page.getByText("Who can access this?", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
});
