import { describe, expect, it } from "vitest";
import {
  indexGrantsByGroup,
  indexGrantsByProject,
  indexGroupsByProfile,
  indexMembersByGroup,
  isInheritedPermissionEffective,
  selectEffectivePermission,
  selectInheritedProjectAccess,
} from "@/lib/access/access-selectors";
import type { AccessGroup, GroupGrant } from "@/lib/access/access-types";

const group = (id: string, rank: number): AccessGroup => ({
  id,
  name: id,
  description: null,
  color: "#000000",
  created_by: "user",
  created_at: "",
  updated_at: "",
  kind: "tier",
  hierarchy_rank: rank,
  grants_global_content: false,
  calendar_access: false,
});
const grant = (
  group_id: string,
  project_id: string,
  permission: GroupGrant["permission"],
): GroupGrant => ({
  group_id,
  project_id,
  permission,
  granted_by: "user",
});

describe("effective access selectors", () => {
  it("builds reusable membership and grant indexes", () => {
    const groups = [group("alpha", 10), group("beta", 20)];
    const members = [
      {
        group_id: "beta",
        profile_id: "person",
        added_by: "user",
        created_at: "",
      },
      {
        group_id: "alpha",
        profile_id: "person",
        added_by: "user",
        created_at: "",
      },
    ];
    const grants = [
      grant("alpha", "p1", "viewer"),
      grant("beta", "p1", "editor"),
    ];

    expect(indexMembersByGroup(members).get("alpha")).toHaveLength(1);
    expect(
      indexGroupsByProfile(groups, members)
        .get("person")
        ?.map(({ id }) => id),
    ).toEqual(["alpha", "beta"]);
    expect(indexGrantsByGroup(grants).get("beta")?.[0].permission).toBe(
      "editor",
    );
    expect(indexGrantsByProject(grants).get("p1")).toHaveLength(2);
  });

  it("derives the strongest inherited permission and retains tied sources", () => {
    const access = selectInheritedProjectAccess(
      group("member", 30),
      [
        group("viewer-a", 10),
        group("viewer-b", 15),
        group("editor", 20),
        group("member", 30),
      ],
      [
        grant("viewer-a", "p1", "viewer"),
        grant("viewer-b", "p2", "viewer"),
        grant("viewer-a", "p2", "viewer"),
        grant("editor", "p1", "editor"),
      ],
    );
    expect(access.get("p1")).toEqual({
      permission: "editor",
      sources: ["editor"],
    });
    expect(access.get("p2")).toEqual({
      permission: "viewer",
      sources: ["viewer-b", "viewer-a"],
    });
  });

  it("uses inherited access only when it is stronger than the direct grant", () => {
    const inherited = { permission: "editor" as const, sources: ["tier"] };
    expect(
      selectEffectivePermission(grant("member", "p1", "viewer"), inherited),
    ).toBe("editor");
    expect(
      isInheritedPermissionEffective(
        grant("member", "p1", "manager"),
        inherited,
      ),
    ).toBe(false);
    expect(
      selectEffectivePermission(grant("member", "p1", "manager"), inherited),
    ).toBe("manager");
  });
});
