import { expect, test } from "@playwright/test";

import * as sponsorshipProgram from "@/lib/sponsorship-program";
import {
  collaborationTypes,
  getMonthlyBackerTierRank,
  monthlyBackerTiers,
  scopedCollaborationTypes,
  SPONSORSHIP_INBOX,
} from "@/lib/sponsorship-program";

test.describe("sponsorship program", () => {
  test("defines three ordered Monthly Backer tiers", () => {
    expect(monthlyBackerTiers).toHaveLength(3);
    expect(monthlyBackerTiers.map((tier) => tier.price)).toEqual([
      100, 250, 500,
    ]);
    expect(getMonthlyBackerTierRank("operations-partner")).toBe(2);
    expect(getMonthlyBackerTierRank(undefined)).toBe(0);
  });

  test("makes each Monthly Backer grid upgrade concrete", () => {
    const gridBenefits = monthlyBackerTiers.map((tier) =>
      tier.deliverables.find((deliverable) =>
        deliverable.includes("Monthly Backers grid"),
      ),
    );

    expect(gridBenefits).toEqual([
      "Standard logo in the Monthly Backers grid, linked to your website",
      "Larger logo in the Monthly Backers grid, linked to your website",
      "Larger linked logo in the first row of the Monthly Backers grid",
    ]);
    expect(monthlyBackerTiers.flatMap((tier) => tier.deliverables)).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("digital badge"),
        expect.stringContaining("Early notice"),
      ]),
    );
  });

  test("includes the approved reporting, spotlight, and National Event benefits", () => {
    const [community, operations, sustaining] = monthlyBackerTiers;

    expect(community.deliverables).toEqual(
      expect.arrayContaining([
        expect.stringContaining("company description"),
        expect.stringContaining("annual sponsor thank-you recap"),
        expect.stringContaining("roster click totals"),
      ]),
    );
    expect(operations.deliverables).toEqual(
      expect.arrayContaining([
        expect.stringContaining("sponsor spotlight per quarter"),
        expect.stringContaining("event-recap content"),
        expect.stringContaining("Quarterly visibility summary"),
      ]),
    );
    expect(sustaining.deliverables).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Verbal sponsor thank-you"),
        expect.stringContaining("recap graphics or video credits"),
        expect.stringContaining("on-site activation or product integration"),
        expect.stringContaining("category exclusivity"),
      ]),
    );
  });

  test("keeps brand collaborations free of a budget gate", () => {
    expect(
      Object.keys(sponsorshipProgram).filter((key) => /budget/i.test(key)),
    ).toEqual([]);
  });

  test("offers event, custom, and unsure collaboration choices", () => {
    expect(collaborationTypes.map((type) => type.slug)).toEqual([
      "event-sponsorship",
      "brand-collaboration",
      "not-sure",
    ]);
  });

  test("describes what every collaboration format typically includes", () => {
    for (const type of collaborationTypes) {
      expect(type.typicallyIncludes.length).toBeGreaterThan(0);

      for (const item of type.typicallyIncludes) {
        expect(item.trim()).not.toBe("");
      }
    }
  });

  test("keeps internal event planning labels out of sponsor-facing copy", () => {
    const copy = JSON.stringify(sponsorshipProgram);

    expect(copy).not.toMatch(/stunt/i);
    expect(copy).not.toMatch(/main event/i);
  });

  test("presents every collaboration format except the unsure choice", () => {
    expect(scopedCollaborationTypes.map((type) => type.slug)).toEqual([
      "event-sponsorship",
      "brand-collaboration",
    ]);
  });

  test("routes sponsorship inquiries to the Ryan inbox", () => {
    expect(SPONSORSHIP_INBOX).toBe("ryan@ryanmeetup.com");
  });
});
