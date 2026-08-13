import { Avatar, Button, DisclosureCard } from "@ryanmeetup/ui";
import { CountBadge } from "@/components/global";
import { profileDisplayName } from "@/lib/presentation";
import type { Profile } from "@/lib/workspace-types";
import type { TaskActivity } from "@/lib/activity-types";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function TaskActivityPanel({
  activity,
  conversationHeight,
  hasMore,
  loading,
  onLoadMore,
  pageLayout,
  profiles,
}: {
  activity: TaskActivity[];
  conversationHeight?: number;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  pageLayout: boolean;
  profiles: Profile[];
}) {
  return (
    <DisclosureCard
      defaultOpen={pageLayout}
      className=""
      buttonClassName="flex w-full items-center justify-between gap-3 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/25 dark:focus-visible:ring-white/30"
      panelClassName="space-y-3 pt-3"
      iconClassName="h-3.5 w-3.5"
      summary={
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
          Activity <CountBadge>{activity.length}</CountBadge>
        </span>
      }
    >
      {loading && (
        <p role="status" className="text-sm text-black/60 dark:text-white/60">
          Loading task history…
        </p>
      )}
      <div
        className={`${pageLayout ? "min-h-48" : "max-h-32"} space-y-3 overflow-y-auto overscroll-contain pr-2`}
        style={
          pageLayout && conversationHeight
            ? {
                maxHeight: Math.max(
                  192,
                  conversationHeight - (hasMore ? 170 : 112),
                ),
              }
            : undefined
        }
      >
        {activity.map((item) => {
          const profile = profiles.find((entry) => entry.id === item.actor_id);
          const name = profileDisplayName(profile, "System");
          return (
            <div
              key={item.id}
              className="flex items-start gap-2 border-l-2 border-black/10 pl-3 text-sm dark:border-white/10"
            >
              <Avatar name={name} size="sm" src={profile?.avatar_url} />
              <span className="min-w-0 flex-1">
                <span className="block">
                  <strong>{name}</strong> {item.action}
                </span>
                <time className="text-xs text-black/45 dark:text-white/45">
                  {dateTimeFormatter.format(new Date(item.created_at))}
                </time>
              </span>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <Button
          type="button"
          variant="secondary"
          loading={loading}
          onClick={onLoadMore}
        >
          Load older activity
        </Button>
      )}
    </DisclosureCard>
  );
}
