"use client";

import { useState } from "react";
import {
  AnimatedCollapse,
  DropdownSelect,
  getFieldLabelClasses,
  Input,
} from "@ryanmeetup/ui";
import {
  MAX_RECURRENCE_COUNT,
  MAX_RECURRENCE_INTERVAL,
  monthlyModeOptions,
  parseRecurrence,
  presetRecurrence,
  recurrencePreset,
  recurrencePresetOptions,
  recurrenceSpanConflict,
  recurrenceSummary,
  sortedWeekdays,
  suggestedRecurrenceEnd,
  WEEKDAY_INITIALS,
  WEEKDAY_NAMES,
  weekdayOf,
  type CalendarRecurrence,
  type CalendarRecurrenceFrequency,
  type RecurrencePreset,
} from "@/lib/calendar/calendar-recurrence";

const choiceClasses =
  "h-4 w-4 border-black/30 accent-black dark:border-white/30 dark:accent-white";

const DEFAULT_COUNT = 13;

const unitOptions: { label: string; value: CalendarRecurrenceFrequency }[] = [
  { label: "day", value: "daily" },
  { label: "week", value: "weekly" },
  { label: "month", value: "monthly" },
  { label: "year", value: "yearly" },
];

export type CalendarRecurrenceFieldsProps = {
  startDate: string;
  endDate: string;
  value: CalendarRecurrence | null;
  onChange: (value: CalendarRecurrence | null) => void;
  disabled?: boolean;
};

/**
 * Repeat controls for a date span. These entries are day-scoped, so a rule
 * chooses which days an entry lands on and never a time of day.
 */
export function CalendarRecurrenceFields({
  startDate,
  endDate,
  value,
  onChange,
  disabled = false,
}: CalendarRecurrenceFieldsProps) {
  const preset = recurrencePreset(value, startDate);
  const interval = value?.interval ?? 1;
  const count = value?.ends.type === "after" ? value.ends.count : DEFAULT_COUNT;
  // A rule that no named preset describes is already custom, so its controls
  // open with it rather than hiding the reason the dropdown says "Custom".
  const [customOpen, setCustomOpen] = useState(preset === "custom");
  // A rule can also become custom without being chosen that way, by moving the
  // start date out from under the preset that described it.
  const showCustom = (customOpen || preset === "custom") && Boolean(value);
  // The number fields are edited as text so they can be cleared mid-edit, and
  // are rewritten whenever the rule changes those numbers from elsewhere.
  const [numbers, setNumbers] = useState({ interval, count });
  const [text, setText] = useState({
    interval: String(interval),
    count: String(count),
  });
  if (numbers.interval !== interval || numbers.count !== count) {
    setNumbers({ interval, count });
    setText({ interval: String(interval), count: String(count) });
  }
  const conflict = recurrenceSpanConflict(startDate, endDate, value);

  function update(changes: Partial<CalendarRecurrence>) {
    if (!value) return;
    const next = { ...value, ...changes };
    // Every weekly rule needs a day to land on, so dropping the last one falls
    // back to the day the entry starts.
    if (next.frequency === "weekly" && !next.weekdays.length)
      next.weekdays = [weekdayOf(startDate)];
    // Normalizing through the same parse the server uses keeps the rule held
    // here identical to the one that comes back from a save.
    onChange(parseRecurrence(next) ?? next);
  }

  function selectPreset(selected: string) {
    const key = selected as RecurrencePreset;
    if (key === "custom") {
      setCustomOpen(true);
      if (!value) onChange(presetRecurrence("weekly", startDate));
      return;
    }
    setCustomOpen(false);
    onChange(presetRecurrence(key, startDate));
  }

  function toggleWeekday(weekday: number) {
    if (!value) return;
    const weekdays = value.weekdays.includes(weekday)
      ? value.weekdays.filter((day) => day !== weekday)
      : sortedWeekdays([...value.weekdays, weekday]);
    update({ weekdays });
  }

  function selectEnd(type: CalendarRecurrence["ends"]["type"]) {
    if (!value) return;
    if (type === "never") return update({ ends: { type: "never" } });
    if (type === "on")
      return update({
        ends: { type: "on", date: suggestedRecurrenceEnd(value, startDate) },
      });
    const typed = Number(text.count);
    update({
      ends: {
        type: "after",
        count:
          Number.isInteger(typed) && typed >= 1 && typed <= MAX_RECURRENCE_COUNT
            ? typed
            : DEFAULT_COUNT,
      },
    });
  }

  return (
    <div className="space-y-3">
      <DropdownSelect
        variant="field"
        required
        label="Repeats"
        value={showCustom ? "custom" : preset}
        disabled={disabled}
        onChange={selectPreset}
        options={recurrencePresetOptions(startDate)}
      />
      <AnimatedCollapse open={showCustom}>
        <div className="space-y-4 rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <Input
              type="number"
              label="Repeat every"
              name="calendar-recurrence-interval"
              min={1}
              max={MAX_RECURRENCE_INTERVAL}
              value={text.interval}
              disabled={disabled}
              onChange={(event) => {
                const typed = Number(event.target.value);
                setText((current) => ({
                  ...current,
                  interval: event.target.value,
                }));
                if (
                  Number.isInteger(typed) &&
                  typed >= 1 &&
                  typed <= MAX_RECURRENCE_INTERVAL
                )
                  update({ interval: typed });
              }}
              onBlur={() =>
                setText((current) => ({
                  ...current,
                  interval: String(interval),
                }))
              }
            />
            <DropdownSelect
              variant="field"
              label="Unit"
              value={value?.frequency ?? "weekly"}
              disabled={disabled}
              onChange={(frequency) =>
                update({ frequency: frequency as CalendarRecurrenceFrequency })
              }
              options={unitOptions.map((option) => ({
                label: interval === 1 ? option.label : `${option.label}s`,
                value: option.value,
              }))}
            />
          </div>
          {value?.frequency === "weekly" && (
            <div role="group" aria-labelledby="calendar-recurrence-weekdays">
              <p
                id="calendar-recurrence-weekdays"
                className={getFieldLabelClasses()}
              >
                Repeat on
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAY_INITIALS.map((initial, weekday) => {
                  const selected = value.weekdays.includes(weekday);
                  return (
                    <button
                      key={WEEKDAY_NAMES[weekday]}
                      type="button"
                      aria-pressed={selected}
                      disabled={disabled}
                      onClick={() => toggleWeekday(weekday)}
                      className={`h-9 w-9 rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:opacity-50 dark:focus-visible:ring-white/40 ${
                        selected
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "bg-black/[0.06] text-black/70 hover:bg-black/10 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15"
                      }`}
                    >
                      <span aria-hidden>{initial}</span>
                      <span className="sr-only">{WEEKDAY_NAMES[weekday]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {value?.frequency === "monthly" && (
            <DropdownSelect
              variant="field"
              label="Repeat on"
              value={value.monthlyMode}
              disabled={disabled}
              onChange={(mode) =>
                update({
                  monthlyMode: mode as CalendarRecurrence["monthlyMode"],
                })
              }
              options={monthlyModeOptions(startDate)}
            />
          )}
          <div role="radiogroup" aria-labelledby="calendar-recurrence-ends">
            <p id="calendar-recurrence-ends" className={getFieldLabelClasses()}>
              Ends
            </p>
            <div className="mt-2 space-y-2 text-sm">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="calendar-recurrence-ends"
                  className={choiceClasses}
                  checked={value?.ends.type === "never"}
                  disabled={disabled}
                  onChange={() => selectEnd("never")}
                />
                Never
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="calendar-recurrence-ends"
                    className={choiceClasses}
                    checked={value?.ends.type === "on"}
                    disabled={disabled}
                    onChange={() => selectEnd("on")}
                  />
                  On
                </label>
                <div className="w-44">
                  <Input
                    type="date"
                    label="Last date"
                    hideLabel
                    name="calendar-recurrence-end-date"
                    min={startDate}
                    value={value?.ends.type === "on" ? value.ends.date : ""}
                    disabled={disabled || value?.ends.type !== "on"}
                    onChange={(event) =>
                      event.target.value >= startDate &&
                      update({ ends: { type: "on", date: event.target.value } })
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="calendar-recurrence-ends"
                    className={choiceClasses}
                    checked={value?.ends.type === "after"}
                    disabled={disabled}
                    onChange={() => selectEnd("after")}
                  />
                  After
                </label>
                <div className="w-24">
                  <Input
                    type="number"
                    label="Occurrences"
                    hideLabel
                    name="calendar-recurrence-count"
                    min={1}
                    max={MAX_RECURRENCE_COUNT}
                    value={text.count}
                    disabled={disabled || value?.ends.type !== "after"}
                    onChange={(event) => {
                      const typed = Number(event.target.value);
                      setText((current) => ({
                        ...current,
                        count: event.target.value,
                      }));
                      if (
                        Number.isInteger(typed) &&
                        typed >= 1 &&
                        typed <= MAX_RECURRENCE_COUNT
                      )
                        update({ ends: { type: "after", count: typed } });
                    }}
                    onBlur={() =>
                      setText((current) => ({
                        ...current,
                        count: String(count),
                      }))
                    }
                  />
                </div>
                times
              </div>
            </div>
          </div>
        </div>
      </AnimatedCollapse>
      <p
        className={`text-xs ${conflict ? "text-red-600 dark:text-red-400" : "text-black/55 dark:text-white/55"}`}
      >
        {conflict ?? recurrenceSummary(value, startDate)}
      </p>
    </div>
  );
}
