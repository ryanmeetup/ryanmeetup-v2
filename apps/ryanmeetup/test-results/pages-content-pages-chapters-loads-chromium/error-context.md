# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pages.spec.ts >> content pages >> /chapters loads
- Location: tests/pages.spec.ts:54:9

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e7]
    - generic [ref=e11]:
      - button "Open issues overlay" [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: "1"
          - generic [ref=e15]: "2"
        - generic [ref=e16]:
          - text: Issue
          - generic [ref=e17]: s
      - button "Collapse issues badge" [ref=e18]
  - main [ref=e21]:
    - generic [ref=e22]:
      - heading "Something went wrong" [level=1] [ref=e23]
      - alert [ref=e24]:
        - generic [ref=e27]: "Invalid src prop (https:///group-photos/ryanroundup.png) on `next/image`, hostname \"group-photos\" is not configured under images in your `next.config.js` See more info: https://nextjs.org/docs/messages/next-image-unconfigured-host"
      - button "Try again" [ref=e28]
  - generic:
    - generic:
      - generic:
        - dialog "Welcome to the Ryan Meetup." [active]:
          - generic [ref=e32]:
            - heading "Welcome to the Ryan Meetup." [level=2] [ref=e35]
            - generic [ref=e39]:
              - checkbox "I certify my name is not Bryan or Brian." [ref=e40]
              - generic [ref=e41] [cursor=pointer]: I certify my name is not Bryan or Brian.
            - generic [ref=e48]:
              - button "Leave" [ref=e49]
              - button "Continue" [disabled] [ref=e51]
  - alert [ref=e53]
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
> 56 |       expect(response?.ok()).toBeTruthy();
     |                              ^ Error: expect(received).toBeTruthy()
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
  76 |       expect(response.headers().location).toBe(route.location);
  77 |     });
  78 |   }
  79 | });
  80 |
```