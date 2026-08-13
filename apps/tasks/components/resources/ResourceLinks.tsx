import { FiExternalLink } from "react-icons/fi";
import type { ResourceLink } from "@/lib/resource-types";

export function ResourceLinks({
  links,
  className = "",
}: {
  links: ResourceLink[];
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <nav
      aria-label="Resource links"
      className={`flex flex-wrap gap-2 ${className}`}
    >
      {links.map((link) => (
        <a
          key={`${link.label}-${link.url}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-black/70 transition hover:border-black/20 hover:bg-black/5 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <FiExternalLink aria-hidden className="shrink-0" />
          <span className="truncate">{link.label}</span>
        </a>
      ))}
    </nav>
  );
}
