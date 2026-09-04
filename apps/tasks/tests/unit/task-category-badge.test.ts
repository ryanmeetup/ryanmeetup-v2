import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TaskCategoryBadge } from "@/components/tasks/TaskCategoryBadge";
import type { Category } from "@/lib/resources/resource-types";

const category: Category = {
  id: "home",
  name: "Home & Living",
  description: null,
  color: "#6d28d9",
  links: [],
  tags: ["Organizing", "Furniture"],
  created_by: "profile",
  archived_at: null,
  access_mode: "open",
};

describe("TaskCategoryBadge", () => {
  it("keeps selected tags out of the visible badge text", () => {
    const markup = renderToStaticMarkup(
      createElement(TaskCategoryBadge, {
        category,
        tags: ["Organizing", "Furniture"],
      }),
    );

    expect(markup).not.toContain("· +");
    expect(markup).toContain(
      'aria-label="Home &amp; Living category; tags: Organizing, Furniture"',
    );
    expect(markup).not.toContain("title=");
    expect(markup).not.toContain(">Organizing<");
    expect(markup).not.toContain(">Furniture<");
  });

  it("describes the empty tag state when no tags are selected", () => {
    const markup = renderToStaticMarkup(
      createElement(TaskCategoryBadge, { category }),
    );

    expect(markup).toContain(
      'aria-label="Home &amp; Living category; no tags selected"',
    );
    expect(markup).not.toContain("title=");
  });
});
