import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Loading from "@/app/(workspace)/loading";
import { WorkspaceShellSkeleton } from "@/components/global/WorkspacePageShell";

describe("route loading state", () => {
  it("marks only the workspace content region as busy", () => {
    const markup = renderToStaticMarkup(Loading());

    expect(markup).toContain('data-workspace-content-loading="true"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).not.toContain("fixed inset-0");
    expect(markup).toContain('aria-label="Loading page content"');
  });

  it("draws the workspace chrome, and no footer, before the shell data lands", () => {
    const markup = renderToStaticMarkup(WorkspaceShellSkeleton());

    expect(markup).toContain("data-workspace-shell-loading");
    expect(markup).toContain("tasks-app-header");
    expect(markup).toContain('aria-label="Loading workspace"');
    expect(markup).not.toContain("tasks-footer");
  });
});
