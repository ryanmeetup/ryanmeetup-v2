import { describe, expect, it, vi } from "vitest";
import { optimisticWrite } from "@/lib/workspace/optimistic-write";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";

/** A workspace reduced to the one list these tests care about. */
type Store = { titles: string[] };

function fakeWorkspace(titles: string[] = []) {
  let state = { titles } as unknown as WorkspaceData;
  const setData = ((update) => {
    state =
      typeof update === "function"
        ? (update as (current: WorkspaceData) => WorkspaceData)(state)
        : update;
  }) as Parameters<typeof optimisticWrite>[0];
  return {
    setData,
    get titles() {
      return (state as unknown as Store).titles;
    },
  };
}

const add = (title: string) => (current: WorkspaceData) =>
  ({
    ...current,
    titles: [...(current as unknown as Store).titles, title],
  }) as unknown as WorkspaceData;

const drop = (title: string) => (current: WorkspaceData) =>
  ({
    ...current,
    titles: (current as unknown as Store).titles.filter(
      (item) => item !== title,
    ),
  }) as unknown as WorkspaceData;

describe("optimisticWrite", () => {
  it("keeps a local change when there is nothing to persist", async () => {
    const workspace = fakeWorkspace();
    const onError = vi.fn();

    const ok = await optimisticWrite(
      workspace.setData,
      { apply: add("Draft"), revert: drop("Draft"), whenFailed: "Nope." },
      onError,
    );

    expect(ok).toBe(true);
    expect(workspace.titles).toEqual(["Draft"]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("replaces the optimistic row with the one the server wrote", async () => {
    const workspace = fakeWorkspace();

    await optimisticWrite(
      workspace.setData,
      {
        apply: add("Draft"),
        revert: drop("Draft"),
        persist: async () => "Saved",
        reconcile: (saved) => (current) => add(saved)(drop("Draft")(current)),
        whenFailed: "Nope.",
      },
      vi.fn(),
    );

    expect(workspace.titles).toEqual(["Saved"]);
  });

  it("undoes the change and reports the failure when the request rejects", async () => {
    const workspace = fakeWorkspace(["Existing"]);
    const onError = vi.fn();
    const onFailed = vi.fn();

    const ok = await optimisticWrite(
      workspace.setData,
      {
        apply: add("Draft"),
        revert: drop("Draft"),
        persist: async () => {
          throw new Error("The server said no.");
        },
        whenFailed: "It could not be saved.",
        onFailed,
      },
      onError,
    );

    expect(ok).toBe(false);
    expect(workspace.titles).toEqual(["Existing"]);
    expect(onFailed).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith("The server said no.");
  });

  it("falls back to its own message when the failure carries none", async () => {
    const onError = vi.fn();

    await optimisticWrite(
      fakeWorkspace().setData,
      {
        apply: add("Draft"),
        revert: drop("Draft"),
        persist: async () => {
          throw new Error("");
        },
        whenFailed: "It could not be saved.",
      },
      onError,
    );

    expect(onError).toHaveBeenCalledWith("It could not be saved.");
  });

  it("reverts only its own change, leaving concurrent writes intact", async () => {
    const workspace = fakeWorkspace();

    const failing = optimisticWrite(
      workspace.setData,
      {
        apply: add("Mine"),
        revert: drop("Mine"),
        persist: async () => {
          // Something else lands while this request is still in flight.
          workspace.setData(add("Theirs"));
          throw new Error("Rejected.");
        },
        whenFailed: "It could not be saved.",
      },
      vi.fn(),
    );
    await failing;

    expect(workspace.titles).toEqual(["Theirs"]);
  });
});
