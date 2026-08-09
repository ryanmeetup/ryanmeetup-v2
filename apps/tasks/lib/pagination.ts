export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const MAX_PAGE_SIZE = 100;

export type PaginationState = {
  page: number;
  pageSize: number;
  totalCount: number;
};

function integer(value: string | null, fallback: number) {
  if (!value || !/^-?\d+$/.test(value)) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) ? parsed : fallback;
}

export function parsePagination(
  params: Pick<URLSearchParams, "get">,
  defaultPageSize = DEFAULT_PAGE_SIZE,
) {
  return {
    requestedPage: Math.max(1, integer(params.get("page"), 1)),
    pageSize: Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, integer(params.get("pageSize"), defaultPageSize)),
    ),
  };
}

export function derivePagination(
  requestedPage: number,
  pageSize: number,
  totalCount: number,
): PaginationState & { totalPages: number; from: number; to: number } {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const from = (page - 1) * pageSize;
  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    from,
    to: from + pageSize - 1,
  };
}
