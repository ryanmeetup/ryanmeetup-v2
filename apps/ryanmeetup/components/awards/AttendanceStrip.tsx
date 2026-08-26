import { Tooltip } from "@ryanmeetup/ui";

import type { AttendanceCell } from "@/utils/streaks";

type AttendanceStripProps = {
  attendance: AttendanceCell[];
  attendedCount: number;
  streakRange?: string;
};

type AttendanceRosterProps = {
  attendance: AttendanceCell[];
};

type CellState = "attended" | "streak" | "missed";

// The longest run wears the same orange as the streak badge two columns over,
// so the number and the picture of it read as one fact.
const cellStyles: Record<CellState, string> = {
  attended: "border-blue-700 bg-blue-700 dark:border-blue-500 dark:bg-blue-500",
  streak:
    "border-orange-500 bg-orange-500 dark:border-orange-400 dark:bg-orange-400",
  missed: "border-black/15 dark:border-white/20",
};

// Named tags carry the same three states as the squares, drawn as outlines so
// a row of two dozen event names stays readable.
const tagStyles: Record<CellState, string> = {
  attended:
    "border-blue-700/40 bg-blue-700/10 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300",
  streak:
    "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:border-orange-400/40 dark:bg-orange-400/10 dark:text-orange-300",
  missed:
    "border-black/10 bg-transparent text-black/40 dark:border-white/10 dark:text-white/40",
};

// The squares stretch to share the column between them, so a wide screen gets
// a full-width bar rather than a short run of dots trailing into empty space.
// The stretching lives on the tooltip's trigger, since that is what the flex
// row lays out; the square inside only has to fill what the trigger is given.
const cellTrigger = "min-w-2 flex-1";
const cellShape = "h-3 w-full rounded-sm border md:h-4";

const legendKeys: { state: CellState; label: string }[] = [
  { state: "attended", label: "Attended" },
  { state: "streak", label: "Longest streak" },
  { state: "missed", label: "Missed" },
];

// What a square means, spelled out for the tooltip that names it. A square is
// the only place the strip says which meetup it is standing for, so hovering
// one has to answer both halves: which meetup, and how it went.
const cellStateLabels: Record<CellState, string> = {
  attended: "Attended",
  streak: "Attended — part of longest streak",
  missed: "Missed",
};

// How many meetups a row names outright. Five is what the full-width column
// fits on one line at the large breakpoints.
const RECENT_NAMED = 5;

const getCellState = (cell: AttendanceCell): CellState => {
  if (!cell.attended) return "missed";

  return cell.inLongestStreak ? "streak" : "attended";
};

// The meetups a Ryan most recently made, newest first. The squares show the
// shape of a record; these show what the record is made of.
const getRecentAttended = (attendance: AttendanceCell[], limit: number) =>
  attendance
    .filter((cell) => cell.attended)
    .slice(-limit)
    .reverse();

const AttendanceStrip = (props: AttendanceStripProps) => {
  const { attendance, attendedCount, streakRange } = props;

  const recent = getRecentAttended(attendance, RECENT_NAMED);
  const olderCount = attendedCount - recent.length;

  // One label for the whole strip: a screen reader reading out every cell of
  // every row would bury the standings it came for.
  const label = [
    `Attended ${attendedCount} of ${attendance.length} Ryan Meetups.`,
    streakRange ? `Longest streak: ${streakRange}.` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="w-full space-y-1.5">
      <div
        role="img"
        aria-label={label}
        className="flex w-full flex-nowrap items-center gap-0.5 md:gap-1"
      >
        {attendance.map((cell) => (
          <Tooltip
            key={cell.event}
            triggerClassName={cellTrigger}
            content={
              <>
                <span className="block">{cell.event}</span>
                <span className="block font-normal opacity-70">
                  {cellStateLabels[getCellState(cell)]}
                </span>
              </>
            }
          >
            <span className={`${cellShape} ${cellStyles[getCellState(cell)]}`} />
          </Tooltip>
        ))}
      </div>

      {/* Naming the most recent meetups keeps real events on the row without a
          tag per meetup, which is what outgrew the old layout. They are a list
          of their own rather than captions for the squares above them, so the
          row says so outright — unlabelled, a short run of names sitting under
          a long run of squares reads as though it should line up with them.
          `w-0 min-w-full` keeps the names from contributing their own width, so
          they wrap inside the squares rather than widening the column. */}
      <div className="flex w-0 min-w-full flex-wrap items-center gap-1 text-[10px] leading-none">
        <span className="uppercase tracking-wider text-black/50 dark:text-white/50">
          Latest
        </span>
        {recent.map((cell) => (
          <span
            key={cell.event}
            className={`rounded-full border px-1.5 py-1 ${tagStyles[getCellState(cell)]}`}
          >
            {cell.event}
          </span>
        ))}
        {olderCount > 0 && (
          <span className="px-0.5 text-black/50 dark:text-white/50">
            + {olderCount} earlier
          </span>
        )}
      </div>
    </div>
  );
};

// Every held meetup by name, shown under a row once it is expanded. This is
// the full detail the strip compresses.
const AttendanceRoster = (props: AttendanceRosterProps) => {
  const { attendance } = props;

  return (
    <div className="flex flex-wrap gap-1.5 pb-4 pl-3 pr-3 md:pl-4">
      {attendance.map((cell) => {
        const state = getCellState(cell);

        return (
          <span
            key={cell.event}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${tagStyles[state]}`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-sm border ${cellStyles[state]}`}
            />
            {cell.event}
          </span>
        );
      })}
    </div>
  );
};

const AttendanceLegend = () => (
  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-black/60 dark:text-white/60">
    {legendKeys.map(({ state, label }) => (
      <span key={state} className="inline-flex items-center gap-2">
        <span className={`h-3 w-3 rounded-sm border ${cellStyles[state]}`} />
        {label}
      </span>
    ))}
  </div>
);

export { AttendanceStrip, AttendanceRoster, AttendanceLegend };
