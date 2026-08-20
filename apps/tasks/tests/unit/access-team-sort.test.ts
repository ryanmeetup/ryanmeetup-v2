import { describe, expect, it } from "vitest";
import { sortAccessTeam } from "@/lib/access-team-sort";
import type { UserAccessMetadata } from "@/lib/access-types";
import type { Profile } from "@/lib/workspace-types";

const profiles = [
  { id: "a", full_name: "Alex", avatar_url: null },
  { id: "b", full_name: "Blair", avatar_url: null },
  { id: "c", full_name: "Casey", avatar_url: null },
] as Profile[];

const metadata = new Map<string, UserAccessMetadata>([
  ["a", { profileId: "a", assignedOpen: 2 } as UserAccessMetadata],
  ["b", { profileId: "b", assignedOpen: 7 } as UserAccessMetadata],
  ["c", { profileId: "c", assignedOpen: 2 } as UserAccessMetadata],
]);

describe("sortAccessTeam", () => {
  it("sorts task counts in either direction and breaks ties by name", () => {
    expect(
      sortAccessTeam(profiles, metadata, "assignedOpen", "desc").map(
        (profile) => profile.id,
      ),
    ).toEqual(["b", "a", "c"]);
    expect(
      sortAccessTeam(profiles, metadata, "assignedOpen", "asc").map(
        (profile) => profile.id,
      ),
    ).toEqual(["a", "c", "b"]);
  });

  it("treats missing task metadata as zero", () => {
    expect(
      sortAccessTeam(profiles, new Map(), "reported", "desc").map(
        (profile) => profile.id,
      ),
    ).toEqual(["a", "b", "c"]);
  });
});
