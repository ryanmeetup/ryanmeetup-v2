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
