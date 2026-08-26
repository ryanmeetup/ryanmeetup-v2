import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isWorkspaceDemo } from "@/lib/server/workspace-page-loader";

/**
 * Demo builds run on fixtures with no database behind them, so every admin
 * screen would offer settings that cannot be saved. The subtree is hidden
 * instead, and the guard sits in the layout so it covers admin routes added
 * later without each page repeating it.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  if (isWorkspaceDemo()) redirect("/");
  return children;
}
