// Components
import { Layout } from "@/components/navigation";
import { Heading, Breadcrumbs, PageNotFound } from "@/components/global";
import { ChapterInfo } from "@/components/chapters";
import { EventsContainer } from "@/components/events";
import { FaCity as City } from "react-icons/fa";
import { MdGroup as Group } from "react-icons/md";

// Types
import type { RyanEvent, ContentfulImage } from "@/lib/types";
import { buildPageMetadata } from "@/utils/metadata";

// Utilities
import { fetchEvents, fetchSingleChapter } from "@/actions/fetchContent";
import { convertSlug } from "@/utils/convert";
import { getChapterSlugFixture } from "@/lib/test-fixtures/chapters";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const fixture =
    process.env.E2E_TESTS === "true"
      ? getChapterSlugFixture(params.slug)
      : null;
  const content = fixture?.chapter ?? (await fetchSingleChapter(params.slug));

  if (content) {
    const { city, state } = content;

    return buildPageMetadata({
      title: `Ryan Meetup - ${city} Chapter`,
      description: `Keep up to date with Ryan Meetups in ${city}, ${state}.`,
      canonical: `https://ryanmeetup.com/chapters/${params.slug}`,
      image: {
        url: `https://ryanmeetup.com/chapters/${params.slug}.png`,
        width: 3360,
        height: 1854,
      },
      keywords: [
        "ryan meetup",
        `ryan meetup ${city}`,
        `ryan meetup ${state}`,
        "ryan meetup chapter",
        `ryan meetup ${city} events`,
        `ryan meetup ${city} chapter`,
      ],
    });
  }
}

const ChapterPage = async ({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { fixture?: string };
}) => {
  const fixture =
    process.env.E2E_TESTS === "true"
      ? getChapterSlugFixture(params.slug, searchParams?.fixture)
      : null;
  const content = fixture?.chapter ?? (await fetchSingleChapter(params.slug));
  const events = fixture?.events ?? (await fetchEvents());

  

  const {
    chapterLeads: leaders,
    city,
    instagram,
    avatar, 
    active: isActive,
    whatsAppLink,
  } = content || {};

  const iconStyle = "mr-2 fill-black h-4 w-4 shrink-0 dark:fill-white";

  const breadcrumbs = [
    {
      icon: <Group className={iconStyle} />,
      href: "/chapters",
      title: "Chapters",
    },
    {
      icon: <City className={iconStyle} />,
      href: `/chapters/${params.slug}`,
      title: city as string,
    },
  ];

  return (
    <Layout>
      {content ? (
        <div className="flex flex-wrap">
          {/* LEFT PANEL (Sticky) */}
          <div className="w-full md:w-1/2 xl:w-1/3 px-4">
            <Breadcrumbs className="flex sm:hidden" crumbs={breadcrumbs} />
            <div className="sticky top-28">
              <ChapterInfo
                leaders={leaders as string[]}
                instagram={instagram as string}
                avatar={avatar as ContentfulImage}
                city={city as string}
                isActive={isActive as boolean}
                whatsApp={whatsAppLink as string}
              />
            </div>
          </div>

          {/* RIGHT PANEL (Scrollable) */}
          <div className="flex-1 p-4">
            <Breadcrumbs className="hidden sm:flex" crumbs={breadcrumbs} />

            <div className="space-y-4 mt-4">
              <EventsContainer
                events={events as unknown as RyanEvent[]}
                eventType={convertSlug(params.slug)}
                showUpcomingSection
                showSearch={false}
              />
            </div>
          </div>
        </div>
      ) : (
        <PageNotFound />
      )}
    </Layout>
  );
};

export default ChapterPage;
