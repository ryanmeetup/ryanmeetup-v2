import { describe, expect, it } from "vitest";
import { bannerSegments, bannerText } from "@/lib/banner";

const base = {
  bannerEnabled: true,
  bannerMessage: "This workspace is in beta. Found an issue or have an idea?",
  bannerLinkUrl: "mailto:ryan@ryanmeetup.com",
  bannerLinkLabel: null,
};

describe("bannerSegments", () => {
  it("prints the instance's own words and never composes its name", () => {
    expect(bannerText(base)).toBe(
      "This workspace is in beta. Found an issue or have an idea? Email ryan@ryanmeetup.com",
    );

    const notice = bannerText({
      ...base,
      bannerMessage: "Scheduled maintenance this Saturday morning.",
      bannerLinkUrl: null,
    });
    expect(notice).toBe("Scheduled maintenance this Saturday morning.");
  });

  it("leaves the message exactly as it was written", () => {
    // No trailing period is added and no clause is appended: an owner who
    // ends on a question keeps the question mark, and one who does not is
    // not given punctuation they did not ask for.
    expect(
      bannerText({
        ...base,
        bannerMessage: "Read-only until 3pm",
        bannerLinkUrl: null,
      }),
    ).toBe("Read-only until 3pm");
  });

  it("takes the label the owner wrote over the derived one", () => {
    expect(
      bannerSegments({
        ...base,
        bannerMessage: "The December schedule is out.",
        bannerLinkUrl: "https://acme.example/schedule",
        bannerLinkLabel: "See the dates",
      }),
    ).toEqual([
      { kind: "text", value: "The December schedule is out. " },
      {
        kind: "link",
        href: "https://acme.example/schedule",
        value: "See the dates",
      },
    ]);
  });

  it("phrases an unlabelled link from its address", () => {
    expect(
      bannerSegments({
        ...base,
        bannerLinkUrl: "https://acme.example/feedback",
      })?.at(-1),
    ).toEqual({
      kind: "link",
      href: "https://acme.example/feedback",
      value: "Learn more",
    });

    expect(bannerSegments(base)?.at(-1)).toEqual({
      kind: "link",
      href: "mailto:ryan@ryanmeetup.com",
      value: "Email ryan@ryanmeetup.com",
    });
  });

  it("drops the link when there is nowhere to send anyone", () => {
    expect(bannerText({ ...base, bannerLinkUrl: null })).toBe(
      "This workspace is in beta. Found an issue or have an idea?",
    );
  });

  it("shows a bare link when the instance left the message empty", () => {
    expect(bannerText({ ...base, bannerMessage: "" })).toBe(
      "Email ryan@ryanmeetup.com",
    );
    expect(
      bannerSegments({ ...base, bannerMessage: "", bannerLinkUrl: null }),
    ).toBeNull();
  });

  it("says nothing at all once an instance turns the banner off", () => {
    expect(bannerSegments({ ...base, bannerEnabled: false })).toBeNull();
    expect(bannerText({ ...base, bannerEnabled: false })).toBeNull();
  });
});
