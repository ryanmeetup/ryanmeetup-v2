# RyanMeetup.com

RyanMeetup.com is the official home of the Ryan Meetup — a community for people named Ryan. The goal is to bring Ryans together and (eventually) break the world record for the largest same‑name gathering (first name only).

Learn more, RSVP to events, and join the community:
- Website: https://ryanmeetup.com
- Instagram: https://www.instagram.com/ryanmeetup/
- Facebook: https://www.facebook.com/ryanmeetup/
- Join: https://www.ryanmeetup.com/join

## About The Ryan Meetup

What started as flyers on city streets turned into a global Ryan community. The Meetup now spans multiple chapters, traveling events, and annual flagship celebrations, all centered on connecting Ryans and building a fun, welcoming community.

## Key Features

- Upcoming and past events with RSVP links
- Chapter directory and local chapter pages
- Ryan Meetup world map
- Photo gallery and media archive
- Flyers and promotional assets
- Contact + newsletter signup
- Press, sponsors, and awards pages
- Light/dark theme support

## Tech Stack

- Next.js (App Router) + React
- TypeScript
- Tailwind CSS
- Headless UI
- Contentful (content/data)
- Mapbox (map rendering)
- EmailJS (contact form)
- React Query
- Vercel (deployment)
- Playwright (e2e tests)

## Getting Started

1. Install dependencies
   - `npm install`

2. Add environment variables
   - Create `.env.local` in the project root (see “Environment Variables” below).

3. Run the dev server
   - `npm run dev`

4. Open http://localhost:3000

## Environment Variables

Create a `.env.local` file with:

- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `NEXT_PUBLIC_EMAIL_USER_ID`
- `NEXT_PUBLIC_EMAIL_TEMPLATE_ID`
- `NEXT_PUBLIC_EMAIL_SERVICE_ID`
- `CONTENTFUL_SPACE_ID`
- `CONTENTFUL_ACCESS_TOKEN`
- `NEXT_PUBLIC_E2E_TESTS` (optional, set to `true` for test mode)

## Useful Scripts

- `npm run dev` — Start local dev server
- `npm run build` — Production build
- `npm run start` — Serve production build
- `npm run lint` — Lint
- `npm run format` — Prettier
- `npm run test:e2e` — Playwright e2e tests

## Credits

- [Matt Sichterman](https://www.msich.dev/) — original domain + early scaffolding
- [Ryan Le](https://ryanle.dev/) — design + development
- [Lorena Pereira](https://lorenapereira.com/) — home page redesign
