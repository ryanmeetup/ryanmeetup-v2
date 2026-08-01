import { FaMagnifyingGlass as Search } from "react-icons/fa6";

type SearchIndicatorProps = {
  isPending: boolean;
};

const SearchIndicator = ({ isPending }: SearchIndicatorProps) => (
  <span role="status" aria-live="polite" aria-atomic="true">
    {isPending ? (
      <span
        aria-hidden="true"
        className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      />
    ) : (
      <Search aria-hidden="true" className="h-4 w-4" />
    )}
    {isPending && <span className="sr-only">Updating search results</span>}
  </span>
);

export { SearchIndicator };
