import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { recoveryBudget, reloadPolicy } from "@/lib/page-recovery";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

describe("recovery budget", () => {
  it("retries a failure that keeps coming back, then stops", () => {
    const claim = recoveryBudget({ attempts: 2, now: () => 0 });

    expect(claim()).toBe(true);
    expect(claim()).toBe(true);
    expect(claim()).toBe(false);
    expect(claim()).toBe(false);
  });

  it("starts fresh once the window has passed", () => {
    let clock = 0;
    const claim = recoveryBudget({
      attempts: 1,
      windowMs: 30_000,
      now: () => clock,
    });

    expect(claim()).toBe(true);
    clock = 30_000;
    expect(claim()).toBe(false);
    clock = 30_001;
    expect(claim()).toBe(true);
  });
});

describe("reload policy", () => {
  it("answers the same failure the same way, however often it is rendered", () => {
    const spent: number[] = [];
    const mayReload = reloadPolicy(() => {
      spent.push(1);
      return spent.length === 1;
    });
    const failure = new Error("JWT issued at future");

    expect(mayReload(failure)).toBe(true);
    expect(mayReload(failure)).toBe(true);
    expect(spent).toHaveLength(1);

    expect(mayReload(new Error("and again"))).toBe(false);
    expect(spent).toHaveLength(2);
  });
});

describe("workspace error boundary", () => {
  it("reads as a page still loading before it reads as a failure", async () => {
    const ErrorPage = (await import("@/app/error")).default;

    const markup = renderToStaticMarkup(
      createElement(ErrorPage, {
        error: Object.assign(new Error("JWT issued at future"), {
          digest: "3241893484",
        }),
        reset: () => undefined,
      }),
    );

    expect(markup).toContain("data-workspace-error-recovering");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).not.toContain("We couldn");
    expect(markup).not.toContain("3241893484");
  });
});
