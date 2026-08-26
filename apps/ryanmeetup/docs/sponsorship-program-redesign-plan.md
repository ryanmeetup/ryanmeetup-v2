# Sponsorship Program Redesign Plan

Status: Planning approved in principle; business rules below are recommended defaults pending final confirmation.

## Goal

Restructure the public sponsorship experience around two distinct paths:

1. **Monthly Backers** — standardized recurring support with published monthly tiers and a low-friction conversation.
2. **Brand Collaborations** — custom deals with no published price floor, including event sponsorships, scoped and priced with the brand through a collaborative intake form.

Existing sponsor relationships and logos carry forward. Rockwall Services remains at $250/month and maps to the Operations Partner tier. Recurring billing continues through Stripe. The program does not include dedicated sponsor email blasts or Discord integrations.

## Recommended Business Decisions

### Monthly Backer tiers

Launch the proposed price ladder as a six-month pilot, then review it using inquiries, close rate, renewal rate, fulfillment time, newsletter reach, and sponsor click data. Publicly describe these as monthly tiers, but do not promise a permanent price.

| Tier               |      Price | Recommended deliverables                                                                                                                                                                                          | Recommendation                                                                                                                                   |
| ------------------ | ---------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Community Backer   | $100/month | Linked grid logo and short company description; plain-text newsletter recognition; annual thank-you recap inclusion; annual roster-click summary                                                                  | Keep website links standard rather than charging a separate tier merely to add an outbound link.                                                 |
| Operations Partner | $250/month | Everything at $100; larger linked logo; visual newsletter logo; quarterly Stories and rotating spotlight; applicable event-recap logo; quarterly visibility summary                                               | Keep grouped Stories and the rotating spotlight to one per quarter so inventory remains sustainable.                                             |
| Sustaining Partner | $500/month | Everything at $250; first-row logo; monthly “Supported by” newsletter banner; signage, verbal thanks, recap credits, and one agreed activation at one National Event; limited category exclusivity when available | Keep National Event benefits tied to one applicable event, written approval, venue requirements, production deadlines, and available categories. |

“Presented by” should be reserved for separately scoped custom collaborations. Physical signage is subject to an applicable National Event occurring during the sponsorship term and the production deadline being met.

Newsletter deliverables should not go live until the newsletter is publishing reliably and the team has a repeatable sponsor-block workflow. If it is not ready at launch, label newsletter benefits as “beginning when the monthly newsletter returns” or hold the affected tiers until it is ready.

Current newsletter sponsorship benchmarks are broad and depend on delivered audience, opens, placement, and format. CPM can inform future price reviews, but Ryan Meetup should sell the complete multi-channel package rather than pretending each tier is a simple newsletter ad. Public guides describe CPM as the common benchmark and recommend separating reach, placement, creative work, and package constraints when setting a rate:

- [beehiiv: newsletter sponsorship pricing](https://www.beehiiv.com/blog/newsletter-sponsorship-cost)
- [Sponsorbench: newsletter sponsorship rates and package pricing](https://getsponsorbench.com/newsletter-sponsorship-rates/)
- [Webex: building tiered event sponsorship packages](https://www.webex.com/content/dam/www/us/en/documents/products/pdf/suite/events/webex-events-guide-event-sponsorship-2023.pdf)

### Custom collaboration taxonomy

**Brand Collaborations** is the umbrella track, not a competing event type. The custom intake choices should be:

- Event Sponsorship — sponsor a Ryan Meetup event
- Custom Brand Collaboration — a non-event or not-yet-defined campaign
- Not Sure Yet

Sponsor-facing copy stays generalized around events. The internal Main Event
and Stunt Event planning distinction is never published on these pages; when a
breakdown is unavoidable, use national events and chapter events.

Every custom option is scoped individually. There is no public rate card and no published minimum: a brand brings the idea, both teams shape the activation, and pricing is agreed during scoping.

### Intake ownership and routing

All sponsorship inquiries route to `ryan@ryanmeetup.com`.

The generic contact route must continue to support shareable query parameters. Sponsorship CTAs should use stable combinations such as:

| Intent                     | Query parameters                                                   |
| -------------------------- | ------------------------------------------------------------------ |
| Monthly Backer             | `topic=sponsorship&detail=monthly-backer&source=partnerships`      |
| Event Sponsorship          | `topic=sponsorship&detail=event-sponsorship&source=partnerships`   |
| Custom Brand Collaboration | `topic=sponsorship&detail=brand-collaboration&source=partnerships` |

The topic/detail selection, seeded subject, message prompt, and destination inbox must agree when someone opens one of these URLs. Existing or old sponsorship query values should remain accepted when practical.

### Monthly Backers as the simple path

Brand collaborations do not gate on budget, so the intake never turns a brand away for being too small. Monthly Backers stays visible as the low-friction alternative for anyone who simply wants to support Ryan Meetup:

1. Keep a standing link from the intake section to `/partnerships#monthly-backers`.
2. Keep the pre-seeded contact link for `detail=monthly-backer` available from the Monthly Backer presentation.
3. Say plainly in the intake copy that Monthly Backers is the simpler path when a brand does not have a specific idea to build.

## Information Architecture

### `/sponsors` — sponsor roster and proof

Purpose: celebrate current partners, show the kinds of support Ryan Meetup has
earned, and hand prospective partners to the dedicated funnel.

Required page order:

1. Hero celebrating the brands and supporters behind Ryan Meetup.
2. Current Monthly Backer logo grid, ordered by tier priority and then sponsor name.
3. Major Brand Collaborations static logo grid.
4. Community & Event Supporters static logo grid.
5. One clear link to `/partnerships` for prospective partners.

Required copy and behavior changes:

- Rename “Recurring Sponsors” to “Monthly Backers.”
- Rename “Featured Brand Partners” to “Major Brand Collaborations.”
- Rename “Community Supporters” to “Community & Event Supporters.”
- Replace the broad `PartnershipPerks` presentation. It currently mixes recurring benefits with custom activation benefits.
- Use static grids. The route already does this, so the proposal’s carousel change is already satisfied.

### `/partnerships` — sponsorship sales funnel

Purpose: convert Monthly Backers and open Brand Collaboration and Ryan Weekend
event sponsorship conversations in one dedicated sales funnel.

Required page order:

1. Dual-track overview covering Monthly Backers and custom collaborations.
2. Custom Brand Collaborations overview, scoped and priced with the brand.
3. Event Sponsorship overview covering national events and chapter meetups.
4. Custom Brand Collaboration option for ideas that do not fit an event format.
5. Relevant opportunity areas and deliverable examples.
6. Verified reach and proof points.
7. Real case studies when approved content exists; hide the section when empty.
8. Collaborative intake form.
9. Idea, scoping, agreement, and activation steps.
10. Monthly Backer tier comparison and direct low-friction CTA.

Keep Monthly Backer pricing on this route so every sponsorship option and
conversion path lives in one place. `/sponsors` should remain focused on the
brands and supporters themselves.

Do not imply that every custom sponsor receives every website, social, press, merchandise, or live-event benefit. Present those as scoping possibilities tied to the selected campaign.

## Data and Content Model

Create one app-owned sponsorship program module, for example `lib/sponsorship-program.ts`, containing:

- Tier names, slugs, prices, summaries, deliverables, and display rank
- Collaboration type names, slugs, and descriptions
- Community guardrails
- Stable analytics labels

Both routes and their forms must consume this module so prices and promises cannot drift.

Keep the current broad sponsor `partnershipType` values for compatibility with the homepage, roster grouping, outbound tracking, and existing Contentful entries. Add a separate optional `backerTier` field:

- `community-backer`
- `operations-partner`
- `sustaining-partner`

Add the same enum field to the Contentful sponsor model and assign Rockwall Services to `operations-partner`. Add an optional `backerDescription` short-text field for the company description shown beneath recurring sponsor logos. Do not infer future tiers from price or sponsor name.

Monthly Backer placement should sort by tier rank first and name second. Premium placement is therefore deterministic without changing existing partner relationships.

## Intake Form

Build a focused app-local `PartnershipInquiryForm` rather than forcing custom sponsorship fields into the generic shared contact form.

Required fields:

- Brand/company name
- Contact first and last name
- Work email
- Brand website
- Desired integration type
- Campaign goals
- Desired timing

There is no budget field. Pricing is worked out with the brand during scoping,
so the form must not imply a minimum or a rate card.

Use shared `Input`, `Textarea`, `DropdownSelect`, feedback, and form-action components. Every required field must have matching visible, ARIA, validation, and submission semantics.

Reuse `sendContactMessage` from `@ryanmeetup/contact` as the existing EmailJS transport. Format the sponsorship fields into a consistent subject and readable message, route to `ryan@ryanmeetup.com`, and include the source route. The existing E2E environment must continue to suppress real sends.

The general `/contact` form remains available as a fallback and must receive the new sponsorship detail options and query-parameter behavior described above.

## Analytics

Add conversion events for:

- Monthly Backer CTA selected
- Custom collaboration CTA selected
- Intake form started
- Intake submitted, including the non-sensitive integration slug

Do not send names, emails, free-form goals, or other personal content to analytics.

Continue passing the existing sponsor category and placement through outbound sponsor-logo tracking. `backerTier` may be added as a non-sensitive event property if it is useful for reporting.

## SEO and Navigation

- Update both routes’ metadata to use Monthly Backer and Brand Collaboration terminology.
- Add `/partnerships` to the sitemap.
- Preserve the existing canonical URLs.
- Use `/partnerships#monthly-backers` as the stable destination for the recurring path.
- Keep internal navigation in `next/link`/`Button.Link`; use `mailto:` only where the design explicitly offers direct email.

## Tests and Verification

Add or update automated coverage for:

- The three tier names, prices, and deliverables render from the central program definition.
- The three roster section names render correctly.
- Rockwall renders as an Operations Partner.
- Monthly Backers sort by tier rank and then name.
- `/partnerships` is included in route smoke coverage, and `/sponsors/partnerships` permanently redirects there.
- All required intake fields are accessible, and no budget field or price floor appears.
- Submissions are formatted correctly and route to `ryan@ryanmeetup.com` without sending during E2E tests.
- Sponsorship contact query parameters select the expected topic/detail and seed the correct subject and prompt.
- No dedicated sponsor email blast or Discord-access claim appears on either route.

Run:

```sh
npm run lint --workspace=@ryanmeetup/ryanmeetup
npm run test:e2e --workspace=@ryanmeetup/ryanmeetup
npm run build:ryanmeetup
git diff --check
```

Visually inspect both routes in light and dark mode at mobile width and at 1024, 1280, and 1536 pixels. Pay particular attention to tier-card density, long deliverables, dropdown values, form labels, and intermediate-width columns.

## Implementation Sequence

### Commit 1 — Program model and Monthly Backer roster

- Add the central sponsorship program definition.
- Add `backerTier` to the application type and Contentful sponsor model.
- Assign Rockwall to Operations Partner.
- Build the tier presentation and update `/sponsors` section names, copy, CTA, ordering, and metadata.
- Add tier and roster tests.

Suggested commit: `feat(sponsors): add monthly backer program`

### Commit 2 — Custom collaboration sales kit

- Reframe `/partnerships` around Monthly Backers and Brand Collaborations.
- Add Event Sponsorship and Custom Collaboration presentations.
- Retain verified reach proof and support optional real case studies.
- Update metadata and sitemap.

Suggested commit: `feat(sponsors): reframe brand collaboration sales kit`

### Commit 3 — Collaboration intake and contact synchronization

- Build the collaborative partnership form.
- Keep Monthly Backers linked as the simple alternative.
- Route submissions to `ryan@ryanmeetup.com`.
- Add and test contact topic/detail query synchronization.
- Add non-sensitive conversion analytics and Playwright coverage.

Suggested commit: `feat(contact): add sponsorship collaboration intake`

## Launch Checklist

- Newsletter publishing and sponsor-block workflow are operational, or affected deliverables are clearly deferred.
- Tier names, prices, and public commitments are approved.
- Rockwall’s new public tier label is confirmed without changing its commercial agreement.
- Contentful `backerTier` is deployed and verified.
- `ryan@ryanmeetup.com` receives a test submission with the expected formatting.
- The intake form has been tested with keyboard and screen-reader semantics.
- Reach statistics have been reverified immediately before launch.
- Real case studies are approved; otherwise the case-study section stays hidden.
- Responsive, light-mode, and dark-mode QA passes.
