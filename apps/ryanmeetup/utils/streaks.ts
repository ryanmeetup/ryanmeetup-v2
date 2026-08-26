import type { RepeatRyan } from "@/lib/types";

type Streak = {
  length: number;
  from?: string;
  to?: string;
};

type AttendanceCell = {
  event: string;
  attended: boolean;
  inLongestStreak: boolean;
};

type LeaderboardRow = {
  ryan: RepeatRyan;
  rank: number;
  streak: Streak;
  attendance: AttendanceCell[];
};

type LeaderboardSort = {
  column: "attended" | "streak";
  direction: "asc" | "desc";
};

const MIN_EVENTS_TO_QUALIFY = 5;

// The `eventsAttended` checkbox list on the Contentful `leaderboard` content
// type is authored in chronological order, so an event's index in that list is
// its place on the timeline. Trailing options are scheduled events nobody has
// been checked into yet, so they would otherwise end every Ryan's streak.
const getHeldEvents = (timeline: string[], ryans: RepeatRyan[]) => {
  const attended = new Set(ryans.flatMap((ryan) => ryan.eventsAttended ?? []));
  let lastHeld = -1;

  timeline.forEach((event, index) => {
    if (attended.has(event)) {
      lastHeld = index;
    }
  });

  return timeline.slice(0, lastHeld + 1);
};

const getLongestStreak = (
  timeline: string[],
  eventsAttended: string[],
): Streak => {
  const attended = new Set(eventsAttended);
  let bestLength = 0;
  let bestStart = 0;
  let runLength = 0;
  let runStart = 0;

  timeline.forEach((event, index) => {
    if (!attended.has(event)) {
      runLength = 0;
      return;
    }

    if (runLength === 0) {
      runStart = index;
    }

    runLength += 1;

    if (runLength > bestLength) {
      bestLength = runLength;
      bestStart = runStart;
    }
  });

  if (bestLength === 0) {
    return { length: 0 };
  }

  return {
    length: bestLength,
    from: timeline[bestStart],
    to: timeline[bestStart + bestLength - 1],
  };
};

// One cell per Ryan Meetup that has actually happened, so a row shows the
// meetups a Ryan missed rather than only the ones they made. Timeline entries
// are unique, so the streak's first event locates the run it belongs to.
const buildAttendance = (
  heldEvents: string[],
  eventsAttended: string[],
  streak: Streak,
): AttendanceCell[] => {
  const attended = new Set(eventsAttended);
  const streakStart = streak.from ? heldEvents.indexOf(streak.from) : -1;
  const streakEnd = streakStart + streak.length - 1;

  return heldEvents.map((event, index) => ({
    event,
    attended: attended.has(event),
    inLongestStreak:
      streakStart >= 0 && index >= streakStart && index <= streakEnd,
  }));
};

const formatStreakRange = (streak: Streak) => {
  if (!streak.from || !streak.to) return undefined;
  if (streak.from === streak.to) return streak.from;

  return `${streak.from} → ${streak.to}`;
};

const compareRank = (
  a: Pick<LeaderboardRow, "ryan">,
  b: Pick<LeaderboardRow, "ryan">,
) => b.ryan.eventsAttended.length - a.ryan.eventsAttended.length;

// Display order inside a rank: the longer streak lists first, so a shared rank
// still reads in a stable, meaningful order.
const compareStandings = (
  a: Pick<LeaderboardRow, "ryan" | "streak">,
  b: Pick<LeaderboardRow, "ryan" | "streak">,
) => compareRank(a, b) || b.streak.length - a.streak.length;

// The best run anyone on the board has put together. Rows that match it wear
// the flame, and a tie hands it to everyone who earned it rather than picking
// one of them arbitrarily.
const getTopStreakLength = (rows: Pick<LeaderboardRow, "streak">[]) =>
  rows.reduce((best, row) => Math.max(best, row.streak.length), 0);

const buildLeaderboardRows = (
  ryans: RepeatRyan[],
  timeline: string[],
): LeaderboardRow[] => {
  const heldEvents = getHeldEvents(timeline, ryans);

  const rows = ryans
    .filter((ryan) => ryan.eventsAttended.length >= MIN_EVENTS_TO_QUALIFY)
    .map((ryan) => {
      const streak = getLongestStreak(heldEvents, ryan.eventsAttended);

      return {
        ryan,
        streak,
        attendance: buildAttendance(heldEvents, ryan.eventsAttended, streak),
      };
    })
    .sort(compareStandings);

  // Ryans tied on attendance share a rank, and the next attendance count takes
  // the next number rather than skipping the places a tie consumed. Skipping
  // reads as a counting bug on a board this short, and it can retire the bronze
  // badge entirely when the runners-up tie.
  const ranked: LeaderboardRow[] = [];
  let rank = 0;

  rows.forEach((row, index) => {
    const previous = ranked[index - 1];

    if (!previous || compareRank(previous, row) !== 0) {
      rank += 1;
    }

    ranked.push({ ...row, rank });
  });

  return ranked;
};

const sortLeaderboardRows = (
  rows: LeaderboardRow[],
  sort: LeaderboardSort,
): LeaderboardRow[] => {
  const factor = sort.direction === "asc" ? -1 : 1;
  const getSortValue = (row: LeaderboardRow) =>
    sort.column === "streak"
      ? row.streak.length
      : row.ryan.eventsAttended.length;

  // Rank follows the active measure, independent of display direction. Dense
  // ranks keep ties together without leaving gaps, matching the default
  // attendance standings when the visitor switches back from streaks.
  const ranks = new Map<number, number>();
  const values = [...new Set(rows.map(getSortValue))].sort((a, b) => b - a);

  values.forEach((value, index) => ranks.set(value, index + 1));

  return [...rows]
    .sort((a, b) => {
      const primary = getSortValue(b) - getSortValue(a);

      return factor * (primary || compareStandings(a, b)) || a.rank - b.rank;
    })
    .map((row) => ({ ...row, rank: ranks.get(getSortValue(row)) ?? row.rank }));
};

export {
  buildLeaderboardRows,
  sortLeaderboardRows,
  MIN_EVENTS_TO_QUALIFY,
  getHeldEvents,
  getLongestStreak,
  getTopStreakLength,
  formatStreakRange,
};
export type { AttendanceCell, LeaderboardRow, LeaderboardSort, Streak };
