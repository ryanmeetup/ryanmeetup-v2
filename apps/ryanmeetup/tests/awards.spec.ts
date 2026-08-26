import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Every fresh page load opens the Bryan check, which covers the page until a
// visitor certifies they are not a Bryan.
const certifyNotABryan = async (page: Page) => {
  await page.getByText("I certify my name is not Bryan or Brian.").click();
  await page.getByRole("button", { name: "Continue" }).click();
};

test.describe("attendance leaderboard", () => {
  test("ranks Ryans by attendance and sorts by longest streak", async ({
    page,
  }) => {
    await page.goto("/awards");
    await certifyNotABryan(page);

    const rows = page.locator("table tbody tr");
    const streakHeader = page.getByRole("columnheader", {
      name: /longest streak/i,
    });

    // Ryan Repeat attended the most Ryan Meetups, so they hold rank one even
    // though Ryan Streak has the longer streak.
    await expect(rows.first()).toContainText("Ryan Repeat");
    await expect(rows.first().locator("td").first()).toHaveText("1");

    await streakHeader.getByRole("button").click();

    await expect(streakHeader).toHaveAttribute("aria-sort", "descending");
    await expect(rows.first()).toContainText("Ryan Streak");
    // The active longest-streak measure determines both order and rank.
    await expect(rows.first().locator("td").first()).toHaveText("1");

    await streakHeader.getByRole("button").click();

    await expect(streakHeader).toHaveAttribute("aria-sort", "ascending");
    await expect(rows.first()).toContainText("Ryan Repeat");

    const attendedHeader = page.getByRole("columnheader", {
      name: /^attended/i,
    });

    await attendedHeader.getByRole("button").click();

    await expect(attendedHeader).toHaveAttribute("aria-sort", "descending");
    await expect(rows.first()).toContainText("Ryan Repeat");
    await expect(rows.first().locator("td").first()).toHaveText("1");
  });

  test("labels the streak leader and each Ryan's personal best", async ({
    page,
  }) => {
    await page.goto("/awards");
    await certifyNotABryan(page);

    const rows = page.locator("table tbody tr");
    const streakLeader = rows.filter({ hasText: "Ryan Streak" }).first();
    const personalBest = rows.filter({ hasText: "Ryan Repeat" }).first();

    // Ryan Streak holds the longest run on the board, so the flame is theirs
    // even though Ryan Repeat outranks them on meetups attended.
    await expect(streakLeader).toContainText("🔥 Streak leader");
    await expect(streakLeader).not.toContainText("Personal best");
    await expect(personalBest).toContainText("Personal best");
    await expect(personalBest).not.toContainText("🔥");
  });

  test("names recent meetups and expands to the full roster", async ({
    page,
  }) => {
    await page.goto("/awards");
    await certifyNotABryan(page);

    const row = page.locator("table tbody tr").first();

    // Ryan Repeat's five most recent meetups are named on the row itself; the
    // earlier ones are only counted until the roster is opened.
    await expect(row).toContainText("Welcome to Ryan");
    await expect(row).toContainText("Ryan Baseball Classic");
    await expect(row).toContainText("+ 13 earlier");
    await expect(row).not.toContainText("Ryan Royale");

    const toggle = row.getByRole("button", {
      name: /every Ryan Meetup for Ryan Repeat/i,
    });

    await toggle.click();

    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    // The roster spells out every meetup that has been held, including the
    // ones this Ryan missed.
    const roster = page.locator("#roster-repeat-ryan");

    await expect(roster).toContainText("Ryan Royale");
    await expect(roster).toContainText("Ryan Retreat");

    await toggle.click();

    // The roster row stays in the table so it can animate closed, so what a
    // visitor should no longer see is the collapsed height, not a missing row.
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(roster).toBeHidden();
  });

  test("gives Ryans tied on meetups attended the same rank", async ({
    page,
  }) => {
    await page.goto("/awards");
    await certifyNotABryan(page);

    const rankOf = (fullName: string) =>
      page
        .locator("table tbody tr", { hasText: fullName })
        .locator("td")
        .first();

    // Ryan Even and Ryan Odd attended the same number of meetups, so the
    // shorter streak does not cost Ryan Odd a place.
    await expect(rankOf("Ryan Even")).toHaveText("3");
    await expect(rankOf("Ryan Odd")).toHaveText("3");
  });

  test("keeps two Ryans sharing a name on separate rows", async ({ page }) => {
    await page.goto("/awards");
    await certifyNotABryan(page);

    const namesakes = page.locator("table tbody tr", {
      hasText: "Ryan Namesake",
    });

    await expect(namesakes).toHaveCount(2);

    const austin = namesakes.filter({ hasText: "Austin, TX" });
    const boston = namesakes.filter({ hasText: "Boston, MA" });

    const austinToggle = austin.getByRole("button", {
      name: /every Ryan Meetup for Ryan Namesake/i,
    });
    const bostonToggle = boston.getByRole("button", {
      name: /every Ryan Meetup for Ryan Namesake/i,
    });

    await austinToggle.click();

    // Opening one namesake's roster must not drag the other one open with it.
    await expect(austinToggle).toHaveAttribute("aria-expanded", "true");
    await expect(bostonToggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#roster-namesake-one")).toBeVisible();
    await expect(page.locator("#roster-namesake-two")).toBeHidden();
  });
});

test.describe("collapsible sections", () => {
  test("opens every section by default and folds one away on click", async ({
    page,
  }) => {
    await page.goto("/awards");
    await certifyNotABryan(page);

    const champions = page.getByRole("button", {
      name: "Ryan Meetup Champions",
    });
    const leaderboard = page.getByRole("button", {
      name: "Attendance Leaderboard",
    });
    const panel = page.locator("#champions-panel");

    // Nothing starts folded, so a visitor who never touches a heading sees the
    // page exactly as it always read.
    await expect(champions).toHaveAttribute("aria-expanded", "true");
    await expect(leaderboard).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toBeVisible();

    await champions.click();

    await expect(champions).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();

    // Folding one section leaves its neighbours open.
    await expect(leaderboard).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("table tbody tr").first()).toBeVisible();

    await champions.click();

    await expect(champions).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toBeVisible();
  });
});
