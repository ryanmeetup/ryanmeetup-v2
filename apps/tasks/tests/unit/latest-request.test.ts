import { describe, expect, it, vi } from "vitest";
import { LatestRequestTracker } from "@/lib/latest-request";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe("LatestRequestTracker", () => {
  it("starts a newer query while the first is unresolved and ignores the old result", async () => {
    const tracker = new LatestRequestTracker();
    const firstResponse = deferred<string>();
    const secondResponse = deferred<string>();
    const apply = vi.fn();

    const load = async (query: string, response: Promise<string>) => {
      const request = tracker.start();
      const result = await response;
      if (tracker.isLatest(request)) apply(query, result);
      tracker.finish(request);
      return request;
    };

    const firstLoad = load("status=backlog", firstResponse.promise);
    const secondLoad = load("status=done", secondResponse.promise);

    expect(tracker.getActive()?.controller.signal.aborted).toBe(false);
    secondResponse.resolve("newer tasks");
    await secondLoad;
    firstResponse.resolve("older tasks");
    const firstRequest = await firstLoad;

    expect(firstRequest.controller.signal.aborted).toBe(true);
    expect(apply).toHaveBeenCalledOnce();
    expect(apply).toHaveBeenCalledWith("status=done", "newer tasks");
  });
});
