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
  it("summarizes selected tags without rendering each tag as a badge", () => {
    const markup = renderToStaticMarkup(
      createElement(TaskCategoryBadge, {
        category,
        tags: ["Organizing", "Furniture"],
      }),
    );

    expect(markup).toContain("· +2");
    expect(markup).toContain(
      'aria-label="Home &amp; Living category; tags: Organizing, Furniture"',
    );
    expect(markup).toContain(
      'title="Home &amp; Living: Organizing, Furniture"',
    );
    expect(markup).not.toContain(">Organizing<");
    expect(markup).not.toContain(">Furniture<");
  });

  it("does not add a count or tooltip when no tags are selected", () => {
    const markup = renderToStaticMarkup(
      createElement(TaskCategoryBadge, { category }),
    );

    expect(markup).not.toContain("· +");
    expect(markup).not.toContain("title=");
  });
});
