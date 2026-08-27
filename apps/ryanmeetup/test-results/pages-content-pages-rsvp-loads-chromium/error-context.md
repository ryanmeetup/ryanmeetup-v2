# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pages.spec.ts >> content pages >> /rsvp loads
- Location: tests/pages.spec.ts:54:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Ryan Meetup returns to California')
Expected: visible
Error: strict mode violation: getByText('Ryan Meetup returns to California') resolved to 2 elements:
    1) <p>Ryan Meetup returns to California September 11–12…</p> aka getByText('Ryan Meetup returns to California September 11–12: Ready Player Ryan + Sun')
    2) <h1 class="tracking-wider font-base font-cooper text-black dark:text-white mb-6 text-center text-7xl title">Ryan Meetup returns to California</h1> aka getByRole('heading', { name: 'Ryan Meetup returns to' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Ryan Meetup returns to California')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - main [ref=e2]:
    - complementary "Ryan Meetup California - Ready Player Ryan and Sun Soaked" [ref=e3]:
      - generic [ref=e4]:
        - paragraph [ref=e8]: "Ryan Meetup returns to California September 11–12: Ready Player Ryan + Sun Soaked!"
        - link "RSVP" [ref=e10] [cursor=pointer]:
          - /url: /rsvp
    - generic [ref=e13]:
      - link [ref=e14] [cursor=pointer]:
        - /url: /
        - heading "RYAN" [level=1] [ref=e15]
      - navigation [ref=e16]:
        - generic [ref=e17]:
          - button "Community" [ref=e20] [cursor=pointer]
          - link "Merch" [ref=e25] [cursor=pointer]:
            - /url: https://ryanmeetup.etsy.com
          - button "Get Involved" [ref=e30] [cursor=pointer]
          - link "Map" [ref=e35] [cursor=pointer]:
            - /url: /map
          - link "Press" [ref=e38] [cursor=pointer]:
            - /url: /press
          - link "Contact Us" [ref=e41] [cursor=pointer]:
            - /url: /contact
      - generic [ref=e44]:
        - link "Donate" [ref=e45] [cursor=pointer]:
          - /url: /donate
        - button "Change to Light Mode" [ref=e48]
    - generic [ref=e51]:
      - generic [ref=e52]:
        - generic [ref=e53]: September 11–12, 2026
        - heading "Ryan Meetup returns to California" [level=1] [ref=e56]
        - generic [ref=e57]:
          - paragraph [ref=e58]: "We're heading west for two back-to-back main events: Ready Player Ryan in Orange, followed by Ryan Meetup × Sun Soaked in Huntington Beach. Pick one or make it a full Ryan weekend."
          - link "Get event updates" [ref=e60] [cursor=pointer]:
            - /url: /newsletter
      - generic [ref=e66]:
        - generic [ref=e68]:
          - heading "California RSVP lineup" [level=2] [ref=e69]
          - paragraph [ref=e71]: 1 open
        - link [ref=e76] [cursor=pointer]:
          - /url: /events
          - generic [ref=e77]:
            - img "Upcoming Ryan Meetup" [ref=e79]
            - generic [ref=e80]:
              - generic [ref=e82]:
                - paragraph [ref=e83]: Sun Sep 06 2026
                - heading "Upcoming Ryan Meetup" [level=3] [ref=e86]
              - paragraph [ref=e87]: Test event description.
              - generic [ref=e88]:
                - paragraph [ref=e92]: New York, NY
                - paragraph [ref=e97]: Ryan Meetup HQ
              - generic [ref=e98]: RSVP
    - generic [ref=e102]:
      - generic [ref=e103]:
        - link [ref=e105] [cursor=pointer]:
          - /url: /
          - heading "RYAN MEETUP" [level=2] [ref=e106]
          - paragraph [ref=e107]: NO BRYANS ALLOWED
        - generic [ref=e108]:
          - region [ref=e109]:
            - heading "Follow us" [level=2] [ref=e110]
            - list [ref=e111]:
              - listitem [ref=e112]:
                - link "Instagram" [ref=e113] [cursor=pointer]:
                  - /url: https://www.instagram.com/ryanmeetup/
              - listitem [ref=e114]:
                - link "Facebook" [ref=e115] [cursor=pointer]:
                  - /url: https://www.facebook.com/ryanmeetup/
              - listitem [ref=e116]:
                - link "Partiful" [ref=e117] [cursor=pointer]:
                  - /url: https://partiful.com/u/sJG4HpH0wS3ZA3YkzaL5
              - listitem [ref=e118]:
                - link "YouTube" [ref=e119] [cursor=pointer]:
                  - /url: https://www.youtube.com/@ryanmeetup
              - listitem [ref=e120]:
                - link "TikTok" [ref=e121] [cursor=pointer]:
                  - /url: https://www.tiktok.com/@ryanmeetup/
              - listitem [ref=e122]:
                - link "Threads" [ref=e123] [cursor=pointer]:
                  - /url: https://www.threads.net/@ryanmeetup
          - region [ref=e124]:
            - heading "Built with" [level=2] [ref=e125]
            - list [ref=e126]:
              - listitem [ref=e127]:
                - link "Vercel" [ref=e128] [cursor=pointer]:
                  - /url: https://vercel.com
              - listitem [ref=e129]:
                - link "Next.js" [ref=e130] [cursor=pointer]:
                  - /url: https://nextjs.org/
              - listitem [ref=e131]:
                - link "React" [ref=e132] [cursor=pointer]:
                  - /url: https://react.dev/
              - listitem [ref=e133]:
                - link "Tailwind CSS" [ref=e134] [cursor=pointer]:
                  - /url: https://tailwindcss.com/
              - listitem [ref=e135]:
                - link "Headless UI" [ref=e136] [cursor=pointer]:
                  - /url: https://headlessui.com/
              - listitem [ref=e137]:
                - link "Contentful" [ref=e138] [cursor=pointer]:
                  - /url: https://www.contentful.com/
              - listitem [ref=e139]:
                - link "Mapbox" [ref=e140] [cursor=pointer]:
                  - /url: https://www.mapbox.com/
      - generic [ref=e142]:
        - generic [ref=e144]:
          - text: Website designed and developed by
          - link "Ryan Le" [ref=e145] [cursor=pointer]:
            - /url: https://ryanle.dev/
          - text: . All Rights Reserved.
        - list [ref=e146]:
          - listitem [ref=e147]:
            - link "Instagram" [ref=e148] [cursor=pointer]:
              - /url: https://www.instagram.com/ryanmeetup/
          - listitem [ref=e151]:
            - link "Facebook" [ref=e152] [cursor=pointer]:
              - /url: https://www.facebook.com/ryanmeetup/
          - listitem [ref=e155]:
            - link "Partiful" [ref=e156] [cursor=pointer]:
              - /url: https://partiful.com/u/sJG4HpH0wS3ZA3YkzaL5
          - listitem [ref=e159]:
            - link "YouTube" [ref=e160] [cursor=pointer]:
              - /url: https://www.youtube.com/@ryanmeetup
          - listitem [ref=e163]:
            - link "TikTok" [ref=e164] [cursor=pointer]:
              - /url: https://www.tiktok.com/@ryanmeetup/
          - listitem [ref=e167]:
            - link "Threads" [ref=e168] [cursor=pointer]:
              - /url: https://www.threads.net/@ryanmeetup
  - button "Open Next.js Dev Tools" [ref=e176] [cursor=pointer]
  - generic:
    - generic:
      - generic:
        - dialog "Welcome to the Ryan Meetup." [active]:
          - generic [ref=e182]:
            - heading "Welcome to the Ryan Meetup." [level=2] [ref=e185]
            - generic [ref=e189]:
              - checkbox "I certify my name is not Bryan or Brian." [ref=e190]
              - generic [ref=e191] [cursor=pointer]: I certify my name is not Bryan or Brian.
            - generic [ref=e198]:
              - button "Leave" [ref=e199]
              - button "Continue" [disabled] [ref=e201]
  - alert [ref=e203]
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
> 62 |         await expect(page.getByText(route.expectText)).toBeVisible();
     |                                                        ^ Error: expect(locator).toBeVisible() failed
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