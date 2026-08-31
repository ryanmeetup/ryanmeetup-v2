import { describe, expect, it } from "vitest";
import { bannerMailtoHref, bannerSegments, bannerText } from "@/lib/banner";

const base = {
  name: "RYAN MEETUP",
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

    // The address is what is read out; the draft the link opens with is for
    // the mail client, not the sentence.
    expect(bannerSegments(base)?.at(-1)).toEqual({
      kind: "link",
      href: bannerMailtoHref("mailto:ryan@ryanmeetup.com", "RYAN MEETUP"),
      value: "Email ryan@ryanmeetup.com",
    });

    expect(
      bannerSegments({
        ...base,
        bannerLinkUrl: "mailto:ryan@ryanmeetup.com?subject=Hello",
      })?.at(-1)?.value,
    ).toBe("Email ryan@ryanmeetup.com");
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

describe("bannerMailtoHref", () => {
  it("opens a draft the reader can act on", () => {
    const href = bannerMailtoHref("mailto:ryan@ryanmeetup.com", "RYAN MEETUP");
    const url = new URL(href);

    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe("ryan@ryanmeetup.com");
    // The subject names the workspace so an address that takes mail from more
    // than one instance can tell them apart. The notice itself still does not.
    expect(url.searchParams.get("subject")).toBe("Feedback: RYAN MEETUP");
    expect(url.searchParams.get("body")).toContain("What's the issue or idea?");
    expect(url.searchParams.get("body")).toContain("Where in the workspace");
  });

  it("leaves a destination the owner already composed alone", () => {
    // Their own subject, and an https page, are both instructions in their
    // own right; neither gets a template appended to it.
    const written = "mailto:team@acme.example?subject=Bug";
    expect(bannerMailtoHref(written, "Acme")).toBe(written);
    expect(bannerMailtoHref("https://acme.example/status", "Acme")).toBe(
      "https://acme.example/status",
    );
  });
});
