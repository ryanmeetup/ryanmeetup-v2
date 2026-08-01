import { useEffect, useMemo, useState } from "react";
import { useQueryParamState } from "@/hooks/useQueryParamState";

type SearchFilterOptions<T> = {
  data: T[];
  buildHaystack: (item: T) => string;
  queryParam?: string;
  debounceMs?: number;
};

const useSearchFilter = <T,>(options: SearchFilterOptions<T>) => {
  const { data, buildHaystack, queryParam = "q", debounceMs = 300 } = options;
  const [urlQuery, setUrlQuery] = useQueryParamState(queryParam);
  const [query, setQuery] = useState(urlQuery);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (query === urlQuery) return;

    const timer = window.setTimeout(() => {
      setUrlQuery(query);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [debounceMs, query, setUrlQuery, urlQuery]);

  const filtered = useMemo(() => {
    const needle = urlQuery.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((item) => buildHaystack(item).includes(needle));
  }, [data, buildHaystack, urlQuery]);

  return { query, setQuery, filtered, isPending: query !== urlQuery };
};

export { useSearchFilter };
