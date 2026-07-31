// Components
import { Text } from "@/components/global";

// Types
import type { Testimonial } from "@/lib/types";

type TestimonyProps = {
  testimony: Testimonial;
};

const Testimony = (props: TestimonyProps) => {
  const {
    // lastName,
    // headshot,
    location,
    quote,
  } = props.testimony;

  return (
    <div className="relative mb-4 break-inside-avoid-column rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_20px_40px_-30px_rgba(0,0,0,0.7)] transition hover:-translate-y-1 hover:border-black/25 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30">
      <div className="space-y-4">
        <Text className="text-base leading-relaxed text-black/70 dark:text-white/70">
          &quot;{quote}&quot;
        </Text>
        <div className="flex items-center justify-end">
          <Text className="text-sm font-semibold text-black dark:text-white">
            — Ryan from {location}
          </Text>
        </div>
      </div>
    </div>
  );
};

export { Testimony };
