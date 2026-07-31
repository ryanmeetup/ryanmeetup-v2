import {
  formatEventCount,
  sortEventsByDate,
  splitEventsByTime,
} from "@/utils/date";

const createEvent = (date: string) =>
  ({
    date,
  }) as unknown as { date: string };

describe("date utils", () => {
  test("formatEventCount pluralizes correctly", () => {
    expect(formatEventCount(1)).toBe("1 event");
    expect(formatEventCount(2)).toBe("2 events");
  });

  test("splitEventsByTime separates upcoming and past", () => {
    const now = new Date("2024-06-01T12:00:00Z").getTime();
    const events = [
      createEvent("2024-05-01"),
      createEvent("2024-06-01"),
      createEvent("2024-07-01"),
    ] as unknown as { date: string }[];

    const { upcoming, past } = splitEventsByTime(events as any, now);
    expect(past).toHaveLength(1);
    expect(upcoming).toHaveLength(2);
  });

  test("sortEventsByDate sorts asc and desc", () => {
    const events = [
      createEvent("2024-06-10"),
      createEvent("2024-06-01"),
      createEvent("2024-06-20"),
    ] as any[];

    const asc = sortEventsByDate(events, "asc").map((e) => e.date);
    const desc = sortEventsByDate(events, "desc").map((e) => e.date);

    expect(asc).toEqual(["2024-06-01", "2024-06-10", "2024-06-20"]);
    expect(desc).toEqual(["2024-06-20", "2024-06-10", "2024-06-01"]);
  });
});
