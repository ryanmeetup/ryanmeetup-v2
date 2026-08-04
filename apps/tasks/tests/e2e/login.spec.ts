import { expect, test } from "@playwright/test";

test("responses include restrictive browser security headers", async ({ request }) => {
  const response = await request.get("/login");
  const headers = response.headers();

  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain("'nonce-");
  expect(headers["content-security-policy"]).toContain("connect-src 'self'");
  expect(headers["content-security-policy"]).toMatch(/wss?:\/\/[^ ;]+/);
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
});

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
