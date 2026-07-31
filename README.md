# Ryan Meetup Platform

This repository contains the Ryan Meetup applications and their shared design
system.

## Workspaces

- `apps/meetup` — Ryan Meetup website
- `apps/ryancon` — RyanCon website
- `packages/ui` — shared React UI primitives
- `packages/brand` — shared Cooper font and Tailwind brand tokens

## Local development

Install all dependencies from the repository root with `npm install`, then run
either application with `npm run dev:meetup` or `npm run dev:ryancon`.

Use `npm run build` to build every workspace.

## Vercel

Keep each application as a separate Vercel project connected to this Git
repository. Set the Ryan Meetup Root Directory to `apps/meetup` and the RyanCon
Root Directory to `apps/ryancon`.

Both projects consume the internal `@ryanmeetup/ui` and `@ryanmeetup/brand`
packages. Shared-package changes affect both projects; app-only changes can skip
the unaffected project.
