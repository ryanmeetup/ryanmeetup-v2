import { describe, expect, it } from "vitest";
import {
  adminAccessGroupPath,
  adminRoutes,
  isActiveAdminRoute,
} from "@/lib/admin/admin-routes";

const route = (href: string) => adminRoutes.find((item) => item.href === href)!;

describe("admin routes", () => {
  it("keeps the overview tab exact so nested pages do not both light up", () => {
    expect(isActiveAdminRoute("/admin", route("/admin"))).toBe(true);
    expect(isActiveAdminRoute("/admin/usage", route("/admin"))).toBe(false);
  });

  it("marks a section active for its own nested routes only", () => {
    const access = route("/admin/access");
    expect(isActiveAdminRoute("/admin/access", access)).toBe(true);
    expect(isActiveAdminRoute("/admin/access/core-team", access)).toBe(true);
    expect(isActiveAdminRoute("/admin/usage", access)).toBe(false);
    // A sibling that merely shares the prefix must not match.
    expect(isActiveAdminRoute("/admin/access-log", access)).toBe(false);
  });

  it("builds access group links under the admin section", () => {
    expect(adminAccessGroupPath("core-team")).toBe("/admin/access/core-team");
  });
});
