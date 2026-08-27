import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Loading from "@/app/(workspace)/loading";

describe("route loading state", () => {
  it("marks only the workspace content region as busy", () => {
    const markup = renderToStaticMarkup(Loading());

    expect(markup).toContain("data-workspace-content-loading=\"true\"");
    expect(markup).toContain("aria-busy=\"true\"");
    expect(markup).not.toContain("fixed inset-0");
    expect(markup).toContain('aria-label="Loading page content"');
  });
});
