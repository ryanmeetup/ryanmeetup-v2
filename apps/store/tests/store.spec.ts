import { expect, test } from "@playwright/test";

test("customer can browse a product and manage the preview cart", async ({ page }) => {
  await page.goto("/products/ryan-meetup-tee");
  await expect(page.getByRole("heading", { name: "Official Ryan Meetup Tee" })).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to cart", { exact: true })).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByText("Official Ryan Meetup Tee", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Increase Official Ryan Meetup Tee quantity" }).click();
  await expect(page.getByLabel("Quantity 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect Shopify to checkout" })).toBeDisabled();
});

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 1024, height: 900 },
  { name: "desktop", width: 1280, height: 900 },
  { name: "wide", width: 1536, height: 960 },
]) {
  test(`home layout at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dress like everyone knows your name." })).toBeVisible();
    if (viewport.name === "mobile") {
      await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
    }
    await page.screenshot({ path: `/private/tmp/store-${viewport.name}.png`, fullPage: true });
  });
}
