import { FiSearch } from "react-icons/fi";
import { Input, type InputProps } from "./Input";
import { Spinner } from "./Spinner";

export type SearchInputProps = Omit<
  InputProps,
  "type" | "leadingIcon" | "trailingAction"
> & {
  /** True while the debounced query is still settling. */
  pending?: boolean;
  /** Announced while `pending`, e.g. "Loading contact results". */
  pendingLabel: string;
};

/**
 * The debounced search field every list and picker in the workspace shares.
 *
 * Pair it with `useSearchFilter`: the input value updates immediately while
 * filtering lags behind, and the spinner is what tells the reader that the
 * results they are looking at are one keystroke stale. Wrap the results below
 * in `PendingResults` with the same flag.
 */
const SearchInput = ({
  pending = false,
  pendingLabel,
  hideLabel = true,
  inputClassName,
  ...props
}: SearchInputProps) => (
  <div className="relative">
    <Input
      {...props}
      hideLabel={hideLabel}
      leadingIcon={<FiSearch aria-hidden />}
      aria-busy={pending}
      inputClassName={`pr-10 ${inputClassName ?? ""}`}
    />
    {pending && (
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/45 dark:text-white/45">
        <Spinner size={16} label={pendingLabel} />
      </span>
    )}
  </div>
);

export { SearchInput };
