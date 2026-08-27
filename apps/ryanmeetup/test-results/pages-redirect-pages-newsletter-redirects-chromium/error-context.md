# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pages.spec.ts >> redirect pages >> /newsletter redirects
- Location: tests/pages.spec.ts:73:9

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "https://docs.google.com/forms/d/e/1FAIpQLSdS8O47kdOcmjXglOt_aGTs2q9qK6CrN4zGFdx62H10a-8kDg/viewform"
Received: "https://ryanmeetup.kit.com/49a74eff6b"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  |
  3  | const contentRoutes = [
  4  |   { path: "/" },
  5  |   { path: "/about" },
  6  |   { path: "/awards" },
  7  |   { path: "/cards" },
  8  |   { path: "/charity" },
  9  |   { path: "/chapters" },
  10 |   { path: "/contact" },
  11 |   { path: "/contribute" },
  12 |   { path: "/donate" },
  13 |   { path: "/events" },
  14 |   { path: "/flyers" },
  15 |   { path: "/gallery" },
  16 |   { path: "/goodbye", expectText: "Goodbye, Bryan." },
  17 |   { path: "/map" },
  18 |   { path: "/press" },
  19 |   { path: "/rsvp", expectText: "Ryan Meetup returns to California" },
  20 |   { path: "/sponsors" },
  21 |   { path: "/sponsors/partnerships" },
  22 | ];
  23 |
  24 | const redirectRoutes = [
  25 |   { path: "/partnerships", location: "/sponsors/partnerships" },
  26 |   { path: "/discord", location: "https://discord.gg/8rPPQMtZCp" },
  27 |   {
  28 |     path: "/guidelines",
  29 |     location:
  30 |       "https://docs.google.com/document/d/1DfDD3iyrQMUHTt4EzbfPytfOOh-de1vk9pHRqqM8obs/edit?tab=t.0",
  31 |   },
  32 |   { path: "/chapter-lead", location: "https://form.typeform.com/to/TZkv7rua" },
  33 |   { path: "/join", location: "https://partiful.com/u/sJG4HpH0wS3ZA3YkzaL5" },
  34 |   { path: "/merch", location: "https://ryanmeetup.etsy.com" },
  35 |   {
  36 |     path: "/newsletter",
  37 |     location:
  38 |       "https://docs.google.com/forms/d/e/1FAIpQLSdS8O47kdOcmjXglOt_aGTs2q9qK6CrN4zGFdx62H10a-8kDg/viewform",
  39 |   },
  40 |   {
  41 |     path: "/qa",
  42 |     location:
  43 |       "https://docs.google.com/forms/d/e/1FAIpQLScP5a5ynWxQU6f1G9hvprObZQSp9QtLs_97Uf82JQJYHj4L4Q/viewform?usp=dialog",
  44 |   },
  45 |   { path: "/rcf", location: "https://us.givergy.com/rytoberfest" },
  46 |   {
  47 |     path: "/whatsapp",
  48 |     location: "https://chat.whatsapp.com/LeI37a2AlMk0OmMfhXPNvq",
  49 |   },
  50 | ];
  51 |
  52 | test.describe("content pages", () => {
  53 |   for (const route of contentRoutes) {
  54 |     test(`${route.path} loads`, async ({ page }) => {
  55 |       const response = await page.goto(route.path);
  56 |       expect(response?.ok()).toBeTruthy();
  57 |
  58 |       if (route.path !== "/cards")
  59 |         await expect(page).toHaveTitle(/Ryan Meetup/);
  60 |
  61 |       if (route.expectText) {
  62 |         await expect(page.getByText(route.expectText)).toBeVisible();
  63 |         return;
  64 |       }
  65 |
  66 |       await expect(page.getByRole("main")).toBeVisible();
  67 |     });
  68 |   }
  69 | });
  70 |
  71 | test.describe("redirect pages", () => {
  72 |   for (const route of redirectRoutes) {
  73 |     test(`${route.path} redirects`, async ({ request }) => {
  74 |       const response = await request.get(route.path, { maxRedirects: 0 });
  75 |       expect([301, 302, 307, 308]).toContain(response.status());
> 76 |       expect(response.headers().location).toBe(route.location);
     |                                           ^ Error: expect(received).toBe(expected) // Object.is equality
  77 |     });
  78 |   }
  79 | });
  80 |
```