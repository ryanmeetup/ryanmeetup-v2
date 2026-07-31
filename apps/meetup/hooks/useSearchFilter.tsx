import { useMemo, useState } from "react";

type SearchFilterOptions<T> = {
  data: T[];
  buildHaystack: (item: T) => string;
};

const useSearchFilter = <T,>(options: SearchFilterOptions<T>) => {
  const { data, buildHaystack } = options;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((item) => buildHaystack(item).includes(needle));
  }, [data, buildHaystack, query]);

  return { query, setQuery, filtered };
};

export { useSearchFilter };
