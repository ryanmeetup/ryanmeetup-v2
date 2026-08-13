# Ryan Meetup Tasks Instructions

These instructions supplement the repository-root `AGENTS.md` for work in
`apps/tasks`.

## Page metadata titles

Every page must set an explicit absolute metadata title ending in
`| Ryan Meetup Tasks`. Do not rely on the root layout's `title.template`:
Next.js does not apply that template to a page in the same route segment, which
can produce inconsistent browser-tab titles.

Use this pattern for static pages:

```tsx
export const metadata: Metadata = {
  title: { absolute: "Dashboard | Ryan Meetup Tasks" },
};
```

Dynamic pages must use the same absolute-title shape from `generateMetadata`.
Task detail pages should use
`RMT-<number>: <task title> | Ryan Meetup Tasks`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
