# Repeating calendar dates

Important dates and time-away entries can repeat. Everything on this calendar is
**day-scoped**: a rule chooses the days an entry lands on and never a time of
day. An entry that runs 9:00 AM to 10:30 AM and repeats weekly keeps those hours
on every date, because the hours belong to the entry and the rule only answers
"which days."

## The rule

A rule lives on the `calendar_events` row in a `recurrence` JSON column and is
read and written through `lib/calendar/calendar-recurrence.ts`:

```ts
{
  frequency: "daily" | "weekly" | "monthly" | "yearly",
  interval: 1,                       // 1–99
  weekdays: [1, 3],                  // weekly only, 0 is Sunday
  monthlyMode: "date" | "weekday",   // monthly only: "the 7th" or "the first Monday"
  ends: { type: "never" }            // or { type: "on", date } / { type: "after", count }
}
```

The column is nullable and an absent rule means the date happens once. Rules
arrive from the database as untyped JSON and from requests as untrusted input,
so both go through `parseRecurrence`; anything it cannot read is refused rather
than saved as a date that quietly stops repeating.

Add the column with:

```sql
alter table public.calendar_events add column if not exists recurrence jsonb;
```

Existing row policies already cover it: a rule is part of the row it belongs to,
not a new object with its own access rules.

## How occurrences are produced

`occurrencesInRange` expands a rule into date spans for the window being drawn,
and the calendar page bounds it with the six-week grid it renders. An occurrence
outside that window is not produced, so any new surface that shows calendar
items has to pass a range wide enough to cover what it draws.

The expansion follows iCalendar behavior in the places where a rule cannot land
on a date: a monthly repeat on the 31st skips months that are shorter, a yearly
repeat on February 29 skips common years, and a weekly repeat that does not
include the start date's weekday first appears on the next selected day.

A span repeats with its own length, so a three-day entry repeats as three-day
entries. Repeating more often than the span lasts would stack an entry on its
own earlier copy; `recurrenceSpanConflict` refuses that in the editor and in the
request schema.

## One row, one series

Every occurrence of a series is drawn from the single workspace row that owns
it, so editing or deleting from any date changes the whole series. There are no
per-occurrence exceptions: an occurrence cannot be moved, skipped, or given its
own title. A date that needs to differ belongs to its own entry.

## Publishing a repeating date to Google

A published series is sent to Google as one event carrying an `RRULE`, not one
copy per date, and Google expands it. Google returns the instances of that
series separately, each naming the series it belongs to in `recurringEventId`,
which is how the imported instances of a published date are recognized and
dropped instead of drawn a second time next to the workspace copies.

An entry that stops repeating publishes an empty rule list, which is what clears
the series Google is still holding.
