"use client";

import { useCallback, useEffect } from "react";
import { useQueryParamState } from "@ryanmeetup/hooks";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/pagination";

const preferenceKey = "ryanmeetup.pagination.page-size";

export function usePagination() {
  const [pageParam, setPageParam] = useQueryParamState("page", "1");
  const [pageSizeParam, setPageSizeParam] = useQueryParamState(
    "pageSize",
    String(DEFAULT_PAGE_SIZE),
  );
  const page = Math.max(1, Number.parseInt(pageParam, 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(pageSizeParam, 10) || DEFAULT_PAGE_SIZE),
  );

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("pageSize")) return;
    const saved = Number.parseInt(localStorage.getItem(preferenceKey) ?? "", 10);
    if (!PAGE_SIZE_OPTIONS.includes(saved as (typeof PAGE_SIZE_OPTIONS)[number]))
      return;
    queueMicrotask(() => setPageSizeParam(String(saved)));
  }, [setPageSizeParam]);

  const setPage = useCallback(
    (value: number) => setPageParam(String(value)),
    [setPageParam],
  );
  const setPageSize = useCallback(
    (value: number) => {
      localStorage.setItem(preferenceKey, String(value));
      setPageSizeParam(String(value));
      setPageParam("1");
    },
    [setPageParam, setPageSizeParam],
  );
  const syncPageSize = useCallback(
    (value: number) => setPageSizeParam(String(value)),
    [setPageSizeParam],
  );

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    syncPage: setPage,
    syncPageSize,
  };
}
