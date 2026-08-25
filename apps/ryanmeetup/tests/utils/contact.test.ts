import { expect, test } from "@playwright/test";

import { buildContactHref, contactHrefs, contactTopics } from "@/utils/contact";

const findTopic = (value: string) =>
  contactTopics.find((topic) => topic.value === value);

test.describe("contact topics", () => {
  test("topic and detail slugs are unique", () => {
    const values = contactTopics.map((topic) => topic.value);
    expect(new Set(values).size).toBe(values.length);

    for (const topic of contactTopics) {
      const details = topic.detail?.options.map((option) => option.value) ?? [];
      expect(new Set(details).size).toBe(details.length);
    }
  });

  test("every topic can seed a subject and route somewhere", () => {
    for (const topic of contactTopics) {
      expect(topic.subject).not.toBe("");
      expect(topic.routeTo).toMatch(/@/);
    }
  });

  test("buildContactHref encodes topic, detail, and source", () => {
    expect(buildContactHref("chapters")).toBe("/contact?topic=chapters");
    expect(
      buildContactHref("chapters", {
        detail: "chapter-question",
        source: "chapter:San Diego",
      }),
    ).toBe(
      "/contact?topic=chapters&detail=chapter-question&source=chapter%3ASan+Diego",
    );
  });

  test("prebuilt CTA links point at real topics and details", () => {
    for (const href of Object.values(contactHrefs)) {
      const params = new URLSearchParams(href.split("?")[1]);
      const topic = findTopic(params.get("topic") ?? "");
      expect(topic, `unknown topic in ${href}`).toBeTruthy();

      const detail = params.get("detail");
      if (detail) {
        const options = topic?.detail?.options ?? [];
        expect(
          options.some((option) => option.value === detail),
          `unknown detail in ${href}`,
        ).toBe(true);
      }
    }
  });
});
