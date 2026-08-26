import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Loading from "@/app/loading";

describe("route loading state", () => {
  it("covers the viewport and marks the footer-suppression state", () => {
    const markup = renderToStaticMarkup(Loading());

    expect(markup).toContain("data-route-loading=\"true\"");
    expect(markup).toContain("aria-busy=\"true\"");
    expect(markup).toContain("fixed inset-0");
    expect(markup).toContain('aria-label="Loading page"');
  });
});
