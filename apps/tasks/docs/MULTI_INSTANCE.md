# Running Tasks as more than one instance

Tasks was built for Ryan Meetup. The goal recorded here is to run the same
codebase as a second, fully separate workspace — its own database, its own
users, its own domain — without forking and without mixing personal data into
the Ryan Meetup database.

The chosen shape is **one codebase, several single-tenant deployments**. Each
instance is a Vercel project pointing at this repo with its own Supabase project
and its own environment. Both deploy from `main`, so a feature shipped once
lands everywhere.

Two approaches were considered and rejected:

- **A permission flag inside the existing database.** Personal data would live
  in the Ryan Meetup database under its RLS surface, and every table and policy
  would need a tenant discriminator retrofitted onto the working access-group
  model in `lib/access` and `docs/access-control-spec.md`.
- **A fork.** Every feature would be written twice or merged by hand forever.

## Status

**Done — the application layer is parameterized**, in two tiers. See "What is
already configurable" below.

**Done — an owner-only `/admin` section** at `/admin`, with Overview, Statuses,
Access, Usage, and Settings. `/admin/settings` edits the runtime branding.
Integration health is reported once, on the admin overview, because it is
read-only status rather than something the settings form can change.

**Pending — apply the migration.**
`supabase/migrations/20260822000000_instance_settings.sql` creates the table the
settings page writes to. Until it is applied, the app logs a warning and serves
build-time defaults; the settings form will fail to save. Apply it with
`supabase db push`.

**Not started — the rest of the database and deployment layer.** See "Remaining
work".

## What is already configurable

### The two tiers

**Build-time (`instanceBuild` in `lib/instance.ts`).** The task key prefix and
changelog version prefix. These compose identifiers: the task key prefix appears
in every task URL and is consumed by `taskKey()`, a pure synchronous function
called from client modules and URL parsing. They cannot vary per request, and
editing one at runtime would break every existing task link. `/admin/settings`
shows them read-only with the variable that changes them.

**Runtime (`InstanceSettings`).** Everything presentational: name, product name,
tagline, description, monogram, accent, logo, footer composition, and link
preview copy. Every one of these is optional. A blank field on
`/admin/settings` is not a missing value — it stores NULL, which means "inherit
the build-time default", and the form shows that default as the input's
placeholder so the two are always distinguishable. `lib/server/instance-settings.ts` reads the `instance_settings`
singleton, layers it over the compiled defaults, and caches the result per
request. `app/layout.tsx` seeds `InstanceProvider` so client components read the
resolved values synchronously through `useInstance()`.

Every value falls back to the Ryan Meetup original, so a deployment that sets
nothing and has no stored row behaves exactly as before.
`tests/unit/instance.test.ts` covers defaults, env overrides, the stored-override
merge, and the validation rules.

The local `.env.example` also lists these, but note it is **gitignored** by the
`.env*` rule in `apps/tasks/.gitignore`, so it does not survive a fresh clone.
The table below is the durable reference.

| Concern | Owner |
| --- | --- |
| Wordmark in header, sidebar, sign-in card | `components/global/InstanceWordmark.tsx` |
| Uploaded logo | `/admin/settings`, stored in the `instance-assets` bucket |
| Fallback logo | `NEXT_PUBLIC_INSTANCE_LOGO_PATH`, a root-relative path in `public/` |
| Page titles | `pageTitle()` from `lib/server/instance-settings.ts`; `useInstancePageTitle()` on the client |
| Root metadata and Open Graph card | `app/layout.tsx`, `app/opengraph-image.tsx` |
| Task key prefix (`RMT-142`) | `NEXT_PUBLIC_TASK_KEY_PREFIX`, consumed by `lib/tasks/task-key.ts` |
| Changelog version format (`RMT v5`) | `NEXT_PUBLIC_CHANGELOG_VERSION_PREFIX`, defaults to the task key prefix |
| Digest email branding | `lib/server/task-digest-email.ts` |
| Footer composition, socials, credit | `components/navigation/TasksFooter.tsx`, `packages/ui/src/SiteFooter.tsx` |
| Social platform icons and labels | `lib/instance-socials.tsx` |
| Accent color outside Tailwind tokens | `NEXT_PUBLIC_INSTANCE_ACCENT` |

### Environment variables

All are optional and client-visible. Because Next.js inlines `NEXT_PUBLIC_*`
values at build time, a change requires a rebuild, not just a restart. For every
runtime-tier value these are only the **default**: a stored `instance_settings`
value wins, and `/admin/settings` is the easier place to change it.

| Variable | Default |
| --- | --- |
| `NEXT_PUBLIC_INSTANCE_NAME` | `Ryan Meetup` |
| `NEXT_PUBLIC_INSTANCE_PRODUCT_NAME` | `<name> Tasks` |
| `NEXT_PUBLIC_INSTANCE_TAGLINE` | `Task tracker` |
| `NEXT_PUBLIC_INSTANCE_DESCRIPTION` | `The private workspace for the <name> core team to plan projects and keep work moving.` |
| `NEXT_PUBLIC_TASK_KEY_PREFIX` | `RMT` — 1-10 alphanumerics starting with a letter |
| `NEXT_PUBLIC_CHANGELOG_VERSION_PREFIX` | the task key prefix |
| `NEXT_PUBLIC_INSTANCE_ACCENT` | `#ee1a25` — six-digit hex |
| `NEXT_PUBLIC_INSTANCE_LOGO_PATH` | none; root-relative path in `public/` |
| `NEXT_PUBLIC_INSTANCE_MONOGRAM` | first letter of the name |
| `NEXT_PUBLIC_INSTANCE_OG_ALT` | `<product name> — private team workspace` |
| `NEXT_PUBLIC_INSTANCE_OG_HEADLINE` | `Tasks` |
| `NEXT_PUBLIC_INSTANCE_OG_TAGLINE` | `Private workspace for the core team` |
| `NEXT_PUBLIC_INSTANCE_OG_MOTTO` | `Plan it. Assign it. Get it done.` |
| `NEXT_PUBLIC_INSTANCE_FOOTER_VARIANT` | `branded` — one of `branded`, `minimal`, `none` |
| `NEXT_PUBLIC_INSTANCE_FOOTER_SUBTITLE` | `NO BRYANS ALLOWED` |
| `NEXT_PUBLIC_INSTANCE_CREDIT_PREFIX` | `Website designed and developed by ` |
| `NEXT_PUBLIC_INSTANCE_CREDIT_LABEL` | `Ryan Le` |
| `NEXT_PUBLIC_INSTANCE_CREDIT_URL` | `https://ryanle.dev/` |
| `NEXT_PUBLIC_INSTANCE_CREDIT_SUFFIX` | `. All Rights Reserved.` |

The footer link columns and social icons have no environment variables: they
are lists rather than scalars, so the compiled defaults in `lib/instance.ts`
are the only build-time values and `/admin/settings` is where an instance
changes them.

Notes on the design:

- The task key prefix is **display-only**. `task_number` is a database column;
  changing the prefix renames what users see and does not touch stored data.
- The prefix, accent color, and logo path are validated at module load and throw
  on malformed input, because they are interpolated into regular expressions,
  inline email styles, and an image URL respectively.
- Changelog markdown frontmatter now carries a bare number (`version: 5`) and
  the display string is composed at read time. The changelog is the *app's*
  release history, so every instance shows the same entries under its own
  prefix. If an instance should have its own entries, scope
  `changelogDirectory` in `lib/server/changelog.ts` per instance.
- `footerSections` and `footerSocials` are lists, and NULL versus `[]` matters:
  NULL means "no override stored", so the compiled default content stands,
  while an empty array is the owner deliberately dropping the columns or the
  icons.
- **The footer is a layout, not a preset.** `SiteFooter`'s `branded` variant is
  a generalized shape — oversized wordmark and subtitle, up to three titled
  link columns, social icons, and a credit sentence — with every part supplied
  by the caller. Nothing in the renderer knows about Ryan Meetup; the "Built
  with" column and the two social accounts are simply this build's default
  content, and another instance replaces them from `/admin/settings` or picks
  `minimal` / `none`. Do not reintroduce instance-specific strings into
  `TasksFooter` or `SiteFooter`; add a setting instead.
- **Socials are a list keyed by platform**, not a column per network, so the
  four Ryan Meetup happens to use do not read as the only ones that exist.
  Adding a network is an entry in `socialPlatforms` plus the two maps in
  `lib/instance-socials.tsx` — no migration and no new form field.
- Every URL setting is validated as **https** on the way in. The columns carry
  a `~ '^https://'` check, so `normalizeHttpUrl` alone was not enough — see
  `httpsUrl` in `lib/api-schema/index.ts`.
- Deployment-level settings — Supabase, Resend, Google, app URL, cron secret —
  were already environment-driven and needed no change. They are reported
  read-only on `/admin/settings` via `lib/server/integration-health.ts`, which
  masks every secret down to a four-character fingerprint. They are deliberately
  not editable: they live in the hosting environment, changing one needs a
  redeploy anyway, and storing them in the database to render into a form would
  turn one compromised owner session into full credential disclosure.
- `lib/server/instance-settings.ts` tolerates the `instance_settings` table not
  existing (Postgres 42P01 / PostgREST PGRST205) and falls back to the compiled
  defaults with a warning. That is narrow on purpose — it covers the window
  between deploying the code and applying the migration, in either order. Every
  other database failure propagates.

## Remaining work

### 1. Get the schema into version control (blocking, and the bulk of the job)

**There is no baseline migration.** `supabase/migrations/` now holds exactly one
forward migration — the `instance_settings` table added for `/admin/settings` —
and nothing describing the schema that already exists. `apps/tasks/AGENTS.md`
still records that "the linked Supabase project is the database and
authorization source of truth."

That means there is still no reproducible way to create the second database's
tables, RLS policies, functions, triggers, or storage buckets — and no disaster
recovery for the first one either. This is worth doing regardless of the second
instance.

Rough shape:

1. `supabase db pull` against the linked `ryanmeetup-tasks` project to generate a
   baseline migration ordered *before* the `instance_settings` one. Confirm it
   captured RLS policies, functions, triggers, enums, and storage bucket
   definitions — `db pull` does not always get everything, especially storage
   config and auth settings.
2. Write a seed file for the rows a fresh workspace needs before it is usable:
   default statuses, categories, and whatever else the onboarding path assumes.
   Trace `loadWorkspacePage` and `WORKSPACE_COLUMNS` to find the required
   collections.
3. Verify with a local `supabase db reset`, then run `npm test` and
   `npm run test:e2e` against the local stack.
4. Update `apps/tasks/AGENTS.md`, which currently tells agents the opposite.

### 2. Make `supabase/config.toml` per-instance

It hardcodes `project_id = "ryanmeetup-tasks"`, `site_url`, and the
`additional_redirect_urls` list. The Supabase CLI supports `env(VAR)`
interpolation, so these can read from the environment like everything else.

### 3. Stand up the second Supabase project

Create it, `supabase db push` the migrations, apply the seed, create the storage
buckets, and configure auth (signup is disabled in the Ryan Meetup project —
decide whether the same applies) plus the redirect URLs for the new domain.

### 4. Stand up the second Vercel project

Same repo, same root directory (`apps/tasks`), new domain, its own environment.
`vercel.json` crons come along automatically, so give the new project its own
`CRON_SECRET`.

### 5. Third-party accounts

- **Resend.** `lib/server/resend-usage.ts` reads account-wide quotas. Two
  instances sharing one API key will double-count on `/usage`. Use a separate
  key per instance, and a separate verified from-address either way.
- **Google Calendar.** One OAuth client can hold both redirect URIs, or create a
  second client for cleaner consent-screen branding. `GOOGLE_CALENDAR_TOKEN_KEY`
  must be generated fresh per instance
  (`openssl rand -base64 32`) since it encrypts stored tokens.

## Known rough edges

- **Demo mode content is Ryan Meetup flavored.** `lib/workspace/demo-data.ts`
  contains RMT projects and people. Any instance running without Supabase
  credentials shows that fixture. Fine for now; parameterize if demo mode
  becomes something a second instance actually uses.
- **The brand theme is shared.** `packages/brand/theme.css` provides Cooper
  Black and the nametag red to every app in the monorepo. A second instance
  currently inherits the Ryan Meetup look apart from
  `NEXT_PUBLIC_INSTANCE_ACCENT`. Tokenizing the display font and full palette
  per instance is a separate, larger piece of work.
- **`WORKSPACE_TIME_ZONE`** in `lib/calendar/google-calendar-sync.ts` is fixed.
  Worth checking if an instance ever lives in another time zone.
