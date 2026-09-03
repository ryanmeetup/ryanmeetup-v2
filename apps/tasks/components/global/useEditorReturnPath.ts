"use client";

import { usePathname, useSearchParams } from "next/navigation";

/** Preserve the page's shareable state when a mobile editor route is opened. */
export function useEditorReturnPath() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}
