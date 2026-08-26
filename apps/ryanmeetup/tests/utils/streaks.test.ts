import { expect, test } from "@playwright/test";

import type { RepeatRyan } from "@/lib/types";
import {
  buildLeaderboardRows,
  formatStreakRange,
  getHeldEvents,
  getLongestStreak,
  getTopStreakLength,
  sortLeaderboardRows,
} from "@/utils/streaks";

const timeline = ["One", "Two", "Three", "Four", "Five", "Six"];

const createRyan = (eventsAttended: string[]) =>
  ({ eventsAttended }) as unknown as RepeatRyan;

test.describe("streak utils", () => {
  test("getHeldEvents drops trailing events nobody has attended", () => {
    const ryans = [createRyan(["One", "Three"]), createRyan(["Four"])];

    expect(getHeldEvents(timeline, ryans)).toEqual([
      "One",
      "Two",
      "Three",
      "Four",
    ]);
  });

  test("getHeldEvents keeps a mid-timeline event nobody attended", () => {
    const ryans = [createRyan(["One", "Three"])];

    expect(getHeldEvents(timeline, ryans)).toEqual(["One", "Two", "Three"]);
  });

  test("getLongestStreak finds the longest run, not the most recent", () => {
    const streak = getLongestStreak(timeline, [
      "One",
      "Three",
      "Four",
      "Five",
      "Two",
    ]);

    expect(streak).toEqual({ length: 5, from: "One", to: "Five" });
  });

  test("getLongestStreak reports the earliest of two equal runs", () => {
    const streak = getLongestStreak(timeline, ["One", "Two", "Four", "Five"]);

    expect(streak).toEqual({ length: 2, from: "One", to: "Two" });
  });

  test("getLongestStreak returns zero when nothing was attended", () => {
    expect(getLongestStreak(timeline, [])).toEqual({ length: 0 });
  });

  test("formatStreakRange collapses a single-event streak", () => {
    expect(formatStreakRange({ length: 1, from: "One", to: "One" })).toBe(
      "One",
    );
    expect(formatStreakRange({ length: 0 })).toBeUndefined();
  });
});

const createRepeat = (fullName: string, eventsAttended: string[]) =>
  ({ fullName, eventsAttended }) as unknown as RepeatRyan;

test.describe("leaderboard rows", () => {
  const leaderboardTimeline = ["One", "Two", "Three", "Four", "Five", "Six"];

  const ryans = [
    // Five events, best streak of three.
    createRepeat("Ryan Five", ["One", "Two", "Three", "Five", "Six"]),
    // Six events, so the highest rank.
    createRepeat("Ryan Six", ["One", "Two", "Three", "Four", "Five", "Six"]),
    // Ties Ryan Five on both counts, so they share a rank.
    createRepeat("Ryan Tie", ["One", "Two", "Three", "Five", "Six"]),
    // Ties Ryan Five on events with a longer streak, so they list first but
    // still hold the same rank.
    createRepeat("Ryan Runner", ["One", "Three", "Four", "Five", "Six"]),
    // Four events, so they do not qualify.
    createRepeat("Ryan Few", ["One", "Two", "Three", "Four"]),
  ];

  const rows = buildLeaderboardRows(ryans, leaderboardTimeline);
  const findRow = (fullName: string) =>
    rows.find((row) => row.ryan.fullName === fullName)!;

  test("drops Ryans below the qualifying event count", () => {
    expect(rows.map((row) => row.ryan.fullName)).not.toContain("Ryan Few");
  });

  test("ranks on attendance alone and orders ties by streak", () => {
    expect(rows.map((row) => [row.ryan.fullName, row.rank])).toEqual([
      ["Ryan Six", 1],
      ["Ryan Runner", 2],
      ["Ryan Five", 2],
      ["Ryan Tie", 2],
    ]);
  });

  test("gives the count after a tie the next rank rather than skipping", () => {
    const all = ["One", "Two", "Three", "Four", "Five", "Six"];
    const tied = buildLeaderboardRows(
      [
        createRepeat("Ryan A", all),
        createRepeat("Ryan B", all),
        createRepeat("Ryan C", all.slice(0, 5)),
        createRepeat("Ryan D", all.slice(0, 5)),
        createRepeat("Ryan E", all.slice(1, 6)),
      ],
      leaderboardTimeline,
    );

    expect(tied.map((row) => row.rank)).toEqual([1, 1, 2, 2, 2]);
  });

  test("sorts and reranks by streak", () => {
    const byStreak = sortLeaderboardRows(rows, {
      column: "streak",
      direction: "asc",
    });

    expect(
      byStreak.map((row) => [row.ryan.fullName, row.streak.length]),
    ).toEqual([
      ["Ryan Five", 3],
      ["Ryan Tie", 3],
      ["Ryan Runner", 4],
      ["Ryan Six", 6],
    ]);
    expect(byStreak.map((row) => row.rank)).toEqual([3, 3, 2, 1]);
  });

  test("marks every held meetup, attended or missed", () => {
    const ryanFive = findRow("Ryan Five");

    expect(
      ryanFive.attendance.map((cell) => [cell.event, cell.attended]),
    ).toEqual([
      ["One", true],
      ["Two", true],
      ["Three", true],
      ["Four", false],
      ["Five", true],
      ["Six", true],
    ]);
  });

  test("flags only the cells inside the longest streak", () => {
    const ryanFive = findRow("Ryan Five");

    expect(
      ryanFive.attendance
        .filter((cell) => cell.inLongestStreak)
        .map((cell) => cell.event),
    ).toEqual(["One", "Two", "Three"]);
  });

  test("reports the longest streak anyone on the board holds", () => {
    expect(getTopStreakLength(rows)).toBe(6);
  });

  test("reports no top streak when nobody has a streak", () => {
    expect(getTopStreakLength([])).toBe(0);
    expect(getTopStreakLength([{ streak: { length: 0 } }])).toBe(0);
  });

  test("sorts attendance ascending and back to descending", () => {
    const ascending = sortLeaderboardRows(rows, {
      column: "attended",
      direction: "asc",
    });
    const descending = sortLeaderboardRows(rows, {
      column: "attended",
      direction: "desc",
    });

    expect(ascending.map((row) => row.ryan.eventsAttended.length)).toEqual([
      5, 5, 5, 6,
    ]);
    expect(descending.map((row) => row.ryan.fullName)).toEqual(
      rows.map((row) => row.ryan.fullName),
    );
    expect(descending.map((row) => row.rank)).toEqual([1, 2, 2, 2]);
  });
});
