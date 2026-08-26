export const monthlyBackerTiers = [
  {
    slug: "community-backer",
    name: "Community Backer",
    price: 100,
    rank: 1,
    summary:
      "A low-commitment way for local and Ryan-owned businesses to show their support.",
    deliverables: [
      "Standard logo in the Monthly Backers grid, linked to your website",
      "Short company description beneath your roster logo",
      "Plain-text newsletter recognition when the monthly newsletter is active",
      "Inclusion in the annual sponsor thank-you recap",
      "Annual visibility summary with Monthly Backers roster click totals",
    ],
  },
  {
    slug: "operations-partner",
    name: "Operations Partner",
    price: 250,
    rank: 2,
    summary:
      "Consistent multi-channel visibility that helps keep Ryan Meetup running.",
    deliverables: [
      "Everything in Community Backer",
      "Larger logo in the Monthly Backers grid, linked to your website",
      "Visual logo in the newsletter partner block when the monthly newsletter is active",
      "One grouped Instagram Stories recognition per quarter",
      "One rotating sponsor spotlight per quarter in an existing newsletter or social roundup",
      "Logo in applicable event-recap content",
      "Quarterly visibility summary covering roster clicks, newsletter placement, and Stories fulfillment",
    ],
  },
  {
    slug: "sustaining-partner",
    name: "Sustaining Partner",
    price: 500,
    rank: 3,
    summary:
      "Our highest recurring visibility level, including an agreed real-world presence.",
    deliverables: [
      "Everything in Operations Partner",
      "Larger linked logo in the first row of the Monthly Backers grid",
      "One Supported by newsletter banner per month when the monthly newsletter is active",
      "Logo on agreed physical signage at one National Event during the active term",
      "Verbal sponsor thank-you at that National Event",
      "Inclusion in that National Event's recap graphics or video credits",
      "One agreed on-site activation or product integration at that National Event, subject to venue and production requirements",
      "Limited category exclusivity during the active term, when agreed in writing and available",
    ],
  },
] as const;

export type MonthlyBackerTier = (typeof monthlyBackerTiers)[number];
export type MonthlyBackerTierSlug = MonthlyBackerTier["slug"];

export const collaborationTypes = [
  {
    slug: "event-sponsorship",
    name: "Event Sponsorship",
    shortName: "Event sponsorship",
    focus: "Community & in-person",
    description:
      "Anchor a Ryan Meetup event with boots-on-the-ground engagement, physical visibility, and the content that comes out of it.",
    bestFor: "Brands that want to show up where Ryans gather",
    typicallyIncludes: [
      "A named presence at a national event or a local chapter meetup",
      "On-site signage, giveaways, or a product moment built into the night",
      "Inclusion in the recap photos, video, and social coverage",
      "A verbal thank-you to the room from the Ryan running the event",
    ],
  },
  {
    slug: "brand-collaboration",
    name: "Custom Brand Collaboration",
    shortName: "Custom collaboration",
    focus: "Built together",
    description:
      "Bring us an idea that does not fit neatly into an event format and we will scope the strongest version together.",
    bestFor: "Brands with a specific campaign idea or activation",
    typicallyIncludes: [
      "A format invented for the campaign—a challenge, a series, a one-off spectacle",
      "Creative scoped with your team before anything gets priced",
      "Content and press built around the idea instead of bolted onto it",
      "Timing and market chosen to fit the brand's calendar",
    ],
  },
  {
    slug: "not-sure",
    name: "Not Sure Yet",
    shortName: "Not sure yet",
    focus: "Find the fit",
    description:
      "Share the outcome you want and we will determine whether an event sponsorship or a custom collaboration makes sense.",
    bestFor: "Teams that know their goal but not the format",
    typicallyIncludes: [
      "A short call to talk through the outcome you are after",
      "A recommendation on which format fits the goal",
      "A scoped proposal once the direction is clear",
    ],
  },
] as const;

/** The formats we present up front; "not sure yet" is an intake choice only. */
export const scopedCollaborationTypes = collaborationTypes.filter(
  (type) => type.slug !== "not-sure",
);

export type CollaborationType = (typeof collaborationTypes)[number];
export type CollaborationTypeSlug = CollaborationType["slug"];

export const getMonthlyBackerTier = (slug?: string) =>
  monthlyBackerTiers.find((tier) => tier.slug === slug);

export const getMonthlyBackerTierRank = (slug?: string) =>
  getMonthlyBackerTier(slug)?.rank ?? 0;

export const SPONSORSHIP_INBOX = "ryan@ryanmeetup.com";
export const MONTHLY_BACKERS_ANCHOR =
  "/sponsors/partnerships#monthly-backers";
