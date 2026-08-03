import { FiInfo } from "react-icons/fi";

export function BetaBanner() {
  return (
    <aside className="flex items-start justify-center gap-3 bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white shadow-sm dark:bg-blue-700 sm:px-6" aria-label="Beta notice">
      <FiInfo className="mt-0.5 shrink-0" aria-hidden />
      <p>
        Ryan Meetup Tasks is currently in beta and undergoing active
        development. If you encounter an issue or have a feature request or
        suggestion, please contact Ryan Le directly.
      </p>
    </aside>
  );
}
