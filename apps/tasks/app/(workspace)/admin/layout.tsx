import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isWorkspaceDemo } from "@/lib/server/workspace-page-loader";

/**
 * Demo mode runs on fixtures with no database behind them, so every admin
 * screen would offer settings that cannot be saved. The subtree is hidden
 * instead, and the guard sits in the layout so it covers admin routes added
 * later without each page repeating it.
 *
 * This also applies to an owner in demo preview — the point of the preview is
 * to see what the demo actually offers — so the way back to admin is the
 * banner's exit control rather than a URL.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (await isWorkspaceDemo()) redirect("/");
  return children;
}
