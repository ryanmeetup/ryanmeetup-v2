import { expect, test } from "@playwright/test";

test("login exposes accessible credentials and validates missing input", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Ryan Meetup" })).toBeVisible();
  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.getByLabel(/^Password/)).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Error: username and password are required")).toBeVisible();
});

test("password visibility is keyboard-operable", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Show password" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel(/^Password/)).toHaveAttribute("type", "text");
});
