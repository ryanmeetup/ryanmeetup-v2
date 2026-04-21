import { useCallback, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";

// Components
import { Heading, Text } from "@/components/global";
import NextImage from "next/image";

type LegendProps = {
  showMeetups: boolean;
  showRyans: boolean;
  showNamedBusinesses: boolean;
  showOwnedBusinesses: boolean;
  showChapters: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  setShowMeetups: Dispatch<SetStateAction<boolean>>;
  setShowRyans: Dispatch<SetStateAction<boolean>>;
  setShowNamedBusinesses: Dispatch<SetStateAction<boolean>>;
  setShowOwnedBusinesses: Dispatch<SetStateAction<boolean>>;
  setShowChapters: Dispatch<SetStateAction<boolean>>;
};

const Legend = (props: LegendProps) => {
  const {
    showMeetups,
    showRyans,
    showNamedBusinesses,
    showOwnedBusinesses,
    showChapters,
    isCollapsed = false,
    onToggleCollapse,
    setShowMeetups,
    setShowRyans,
    setShowNamedBusinesses,
    setShowOwnedBusinesses,
    setShowChapters,
  } = props;

  const toggleMeetups = useCallback(() => {
    setShowMeetups((prev: boolean) => !prev);
  }, [setShowMeetups]);

  const toggleRyans = useCallback(() => {
    setShowRyans((prev: boolean) => !prev);
  }, [setShowRyans]);

  const toggleNamedBusinesses = useCallback(() => {
    setShowNamedBusinesses((prev: boolean) => !prev);
  }, [setShowNamedBusinesses]);

  const toggleOwnedBusinesses = useCallback(() => {
    setShowOwnedBusinesses((prev: boolean) => !prev);
  }, [setShowOwnedBusinesses]);

  const toggleChapters = useCallback(() => {
    setShowChapters((prev: boolean) => !prev);
  }, [setShowChapters]);

  const options = useMemo(
    () => [
      {
        checked: showMeetups,
        handler: toggleMeetups,
        text: "Ryan Meetup",
        alt: "Past or future Ryan Meetup location.",
        icon: "/icons/partiful.webp",
      },
      {
        checked: showRyans,
        handler: toggleRyans,
        text: "Ryan lives here",
        alt: "There's at least one of the Ryans that lives here.",
        icon: "/icons/ryanicon.png",
      },
      {
        checked: showNamedBusinesses,
        handler: toggleNamedBusinesses,
        text: "Ryan-Named Biz",
        alt: "Ryan-Named Businesses",
        icon: "/icons/nametagicon.png",
      },
      {
        checked: showOwnedBusinesses,
        handler: toggleOwnedBusinesses,
        text: "Ryan-Owned Biz",
        alt: "Ryan-Owned Businesses",
        icon: "/icons/brief.png",
      },
      {
        checked: showChapters,
        handler: toggleChapters,
        text: "Local Chapter",
        alt: "Ryan Meetup Chapter",
        iconNode: "📍",
      },
    ],
    [
      showMeetups,
      showRyans,
      showNamedBusinesses,
      showOwnedBusinesses,
      showChapters,
      toggleMeetups,
      toggleRyans,
      toggleNamedBusinesses,
      toggleOwnedBusinesses,
      toggleChapters,
    ],
  );

  return (
    <div className="absolute bottom-[36px] right-2 w-44 lg:bottom-8 lg:right-8 lg:w-52">
      <div className="rounded-2xl border border-black/10 bg-white/95 p-3 shadow-sm dark:border-white/30 dark:bg-black dark:shadow-xl lg:p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Heading
            className="text-sm font-semibold text-black dark:text-white/90 lg:text-base"
            size="h3"
          >
            Legend
          </Heading>
          {onToggleCollapse && (
            <button
              type="button"
              className="text-xs font-semibold text-black/70 transition hover:text-black dark:text-white/80 dark:hover:text-white"
              onClick={onToggleCollapse}
            >
              {isCollapsed ? "Expand" : "Minimize"}
            </button>
          )}
        </div>
        {!isCollapsed && (
          <div className="space-y-1.5 lg:space-y-2">
            {options.map((option) => (
              <div className="flex items-center justify-between gap-2" key={option.text}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-black dark:accent-white dark:bg-white/10 lg:h-4 lg:w-4"
                    checked={option.checked}
                    aria-label={option.text}
                    onChange={option.handler}
                  />
                  <Text className="text-xs text-black/70 dark:text-white/80">
                    {option.text}
                  </Text>
                </label>
                {option.iconNode ? (
                  <span className="text-base leading-none" aria-hidden="true">
                    {option.iconNode}
                  </span>
                ) : (
                  <NextImage
                    className={`flex shrink-0 ${option.text === "Ryan lives here" ? "rounded-full" : ""}`}
                    src={option.icon as string}
                    width={20}
                    height={20}
                    alt={option.alt}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { Legend };
