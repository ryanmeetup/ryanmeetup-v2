// Components
import { Heading, Text } from "@/components/global";
import { EventTag } from "@/components/awards";
import { RepeatRyan } from "@/lib/types";
import NextImage from "next/image";
import NextLink from "next/link";
import { contactHrefs } from "@/utils/contact";

// Utilities
import { convertImageUrl } from "@/utils/convert";

type LeaderboardProps = {
  ryans: RepeatRyan[];
};

const TableHeader = () => (
  <thead className="uppercase tracking-[0.3em] text-[10px] text-black/70 dark:text-white/70">
    <tr className="border-b border-black/10 dark:border-white/10">
      <th scope="col" className="w-16 pb-3" aria-label="Headshot" />
      <th scope="col" className="w-48 pb-3">
        Name
      </th>
      <th scope="col" className="w-48 pb-3">
        Based in
      </th>
      <th scope="col" className="w-32 pb-3 text-center">
        # Attended
      </th>
      <th scope="col" className="hidden xl:block pb-3">
        Events Attended
      </th>
    </tr>
  </thead>
);

const Leaderboard = (props: LeaderboardProps) => {
  const { ryans } = props;

  const sortedRyans = ryans.sort(
    (a, b) => b.eventsAttended.length - a.eventsAttended.length,
  );
  const filteredRyans = sortedRyans.filter(
    (ryan) => ryan.eventsAttended.length >= 4,
  );

  return (
    <div>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <Heading className="text-3xl title sm:text-4xl">
            Attendance Leaderboard
          </Heading>
          <Text className="text-sm text-black/70 dark:text-white/70">
            <span className="font-semibold text-blue-700 dark:text-blue-500">
              *
            </span>
            Ryans must attend at least four Ryan Meetups to qualify.
          </Text>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5 pt-4">
          <table className="w-full text-sm text-left">
            <TableHeader />
            <tbody>
              {filteredRyans.map((ryan, index) => (
                <tr
                  key={`${ryan.fullName}-${index}`}
                  className={`border-b border-black/10 dark:border-white/10 ${index % 2 === 0 ? "bg-black/[0.02] dark:bg-white/[0.03]" : ""}`}
                >
                  <td className="py-3 px-4">
                    <div className="relative h-10 w-10 md:h-12 md:w-12">
                      <NextImage
                        className="rounded-full shadow-lg"
                        src={convertImageUrl(ryan.headshot) ?? "/trophy.png"}
                        fill
                        style={{ objectFit: "cover" }}
                        alt={ryan.fullName}
                      />
                    </div>
                  </td>
                  <td className="py-3">
                    <Text className="text-xs font-semibold text-black dark:text-white md:text-sm lg:text-base">
                      {ryan.fullName}
                    </Text>
                  </td>
                  <td className="py-3">
                    <Text className="text-xs text-black/70 dark:text-white/70 md:text-sm lg:text-base">
                      {ryan.basedIn}
                    </Text>
                  </td>
                  <td className="py-3 text-center">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-white/80 text-3xl font-semibold text-black dark:border-white/15 dark:bg-white/10 dark:text-white">
                      {ryan.eventsAttended.length}
                    </span>
                  </td>
                  <td className="py-3 hidden xl:block">
                    <div className="flex flex-wrap items-center gap-1">
                      {ryan.eventsAttended.map((event, eventIndex) => (
                        <EventTag key={eventIndex} event={event} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2 text-center my-16">
        <Heading className="text-3xl title sm:text-4xl">
          Not seeing your name?
        </Heading>
        <Text className="text-base text-black/70 dark:text-white/70">
          Get in contact through our{" "}
          <NextLink
            href={contactHrefs.awardsCorrection}
            className="font-semibold text-blue-700 dark:text-blue-500 hover:cursor"
          >
            /contact
          </NextLink>{" "}
          page or shoot us an email at{" "}
          <NextLink
            className="font-semibold text-blue-700 dark:text-blue-500 hover:cursor"
            href="mailto:ryan@ryanmeetup.com"
          >
            ryan@ryanmeetup.com
          </NextLink>
          .
        </Text>
      </div>
    </div>
  );
};

export { Leaderboard };
