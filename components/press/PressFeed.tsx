"use client";

import { useMemo, useState } from "react";

// Components
import { Article } from "@/components/press";
import {
  Card,
  EmptyState,
  FilterBar,
  Heading,
  Input,
  Text,
} from "@/components/global";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Transition,
} from "@headlessui/react";
import { FaChevronDown as ChevronDown } from "react-icons/fa";

// Types
import type { Article as RyanArticle } from "@/lib/types";

// Utilities
import { useSearchFilter } from "@/hooks/useSearchFilter";

type PressFeedProps = {
  articles: RyanArticle[];
};

const buildArticleSearchText = (article: RyanArticle) =>
  JSON.stringify(article).toLowerCase();

const getYear = (article: RyanArticle) => {
  const date = new Date(article.publishedOn ?? article.publishDate);
  return Number.isNaN(date.getTime()) ? "Unknown" : String(date.getFullYear());
};

const PressFeed = (props: PressFeedProps) => {
  const { articles } = props;
  const [activeOutlet, setActiveOutlet] = useState("All");
  const [activeYear, setActiveYear] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const {
    query,
    setQuery,
    filtered: searchedArticles,
  } = useSearchFilter({
    data: articles,
    buildHaystack: buildArticleSearchText,
  });

  const outletOptions = useMemo(() => {
    const outlets = new Set(
      articles.map((article) => article.outlet).filter(Boolean),
    );
    return ["All", ...Array.from(outlets).sort()];
  }, [articles]);

  const yearOptions = useMemo(() => {
    const years = new Set(articles.map(getYear));
    return [
      "All",
      ...Array.from(years)
        .filter((year) => year !== "Unknown")
        .sort()
        .reverse(),
    ];
  }, [articles]);

  const filtered = useMemo(() => {
    return searchedArticles.filter((article) => {
      if (activeOutlet !== "All" && article.outlet !== activeOutlet) {
        return false;
      }
      if (activeYear !== "All" && getYear(article) !== activeYear) {
        return false;
      }
      return true;
    });
  }, [searchedArticles, activeOutlet, activeYear]);

  const groupedByYear = useMemo(() => {
    return filtered.reduce<Record<string, RyanArticle[]>>((acc, article) => {
      const year = getYear(article);
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(article);
      return acc;
    }, {});
  }, [filtered]);

  const orderedYears = useMemo(() => {
    return Object.keys(groupedByYear)
      .filter((year) => year !== "Unknown")
      .sort()
      .reverse();
  }, [groupedByYear]);

  return (
    <div>
      <FilterBar
        className="mb-6"
        search={
          <Input
            label="Search articles"
            name="article-search"
            placeholder="Search by title, author, outlet, or keyword..."
            inputClassName="pr-4"
            onChange={(event) => setQuery(event.target.value)}
            value={query}
          />
        }
      />

      <div className="flex items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-black/70 dark:text-white/70">
          Filter articles
        </Text>
        <button
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
          className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-black/70 transition hover:border-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/10 dark:bg-white/10 dark:text-white/70 dark:hover:border-white/40 dark:focus-visible:ring-white/30"
          aria-expanded={showFilters}
        >
          {showFilters ? "Hide filters" : "Show filters"}
        </button>
      </div>

      {showFilters && (
        <Card variant="soft" size="sm" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-black/70 dark:text-white/70">
              Filter by outlet
            </Text>
            <div className="flex flex-wrap gap-2">
              {outletOptions.map((outlet) => {
                const isActive = outlet === activeOutlet;

                return (
                  <button
                    key={outlet}
                    type="button"
                    onClick={() => setActiveOutlet(outlet)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30 ${
                      isActive
                        ? "border-black/80 bg-black text-white dark:border-white/80 dark:bg-white dark:text-black"
                        : "border-black/10 bg-white/80 text-black/70 hover:border-black/30 dark:border-white/10 dark:bg-white/10 dark:text-white/70 dark:hover:border-white/40"
                    }`}
                    aria-pressed={isActive}
                  >
                    {outlet}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-black/70 dark:text-white/70">
              Filter by year
            </Text>
            <div className="flex flex-wrap gap-2">
              {yearOptions.map((year) => {
                const isActive = year === activeYear;

                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setActiveYear(year)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30 ${
                      isActive
                        ? "border-black/80 bg-black text-white dark:border-white/80 dark:bg-white dark:text-black"
                        : "border-black/10 bg-white/80 text-black/70 hover:border-black/30 dark:border-white/10 dark:bg-white/10 dark:text-white/70 dark:hover:border-white/40"
                    }`}
                    aria-pressed={isActive}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <div className="relative mt-8">
        <div className="absolute left-3 top-0 h-full w-px bg-black/10 dark:bg-white/10" />
        <div className="space-y-10">
          {orderedYears.map((year) => (
            <Disclosure key={year} as="div" className="w-full" defaultOpen>
              {({ open }) => (
                <div className="space-y-6">
                  <DisclosureButton
                    id={`press-articles-${year}`}
                    className="group relative flex w-full items-center justify-between gap-4 pb-3 pl-10 text-left"
                  >
                    <div className="absolute left-2 top-1 h-3 w-3 rounded-full border border-black/20 bg-white dark:border-white/20 dark:bg-black" />
                    <div className="absolute bottom-0 left-10 right-0 h-px bg-black/10 transition group-hover:bg-black/20 dark:bg-white/10 dark:group-hover:bg-white/20" />
                    <div className="flex flex-wrap items-center gap-3">
                      <Heading className="text-5xl title" size="h3">
                        {year}
                      </Heading>
                      <span className="flex items-center rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-black/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70">
                        {groupedByYear[year].length} articles
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-black/55 timing dark:text-white/55 ${open && "-rotate-180"}`}
                    />
                  </DisclosureButton>

                  <div className="overflow-hidden">
                    <Transition
                      enter="duration-200 ease-in-out"
                      enterFrom="opacity-0 -translate-y-4"
                      enterTo="opacity-100 translate-y-0"
                      leave="duration-200 ease-in-out"
                      leaveFrom="opacity-100 translate-y-0"
                      leaveTo="opacity-0 -translate-y-4"
                    >
                      <DisclosurePanel className="origin-top space-y-8 transition">
                        {groupedByYear[year].map((article) => (
                          <div key={article.href} className="relative pl-10">
                            <div className="absolute left-2 top-6 h-3 w-3 rounded-full border border-black/20 bg-white dark:border-white/20 dark:bg-black" />
                            <Article article={article} />
                          </div>
                        ))}
                      </DisclosurePanel>
                    </Transition>
                  </div>
                </div>
              )}
            </Disclosure>
          ))}
        </div>
      </div>
      {filtered.length === 0 && (
        <EmptyState
          className="mt-6"
          message="No articles match your search and filters."
        />
      )}
    </div>
  );
};

export { PressFeed };
