// Components
import { Layout } from "@/components/navigation";
import { PageNotFound } from "@/components/global";

// Types
import { buildPageMetadata } from "@/utils/metadata";

export const metadata = buildPageMetadata({
  title: "404 Ryan Not Found",
  description: "404 - Ryan Not Found",
  canonical: "https://ryanmeetup.com",
  image: {
    url: "https://ryanmeetup.com/group-photos/ryanroundup.png",
    width: 3284,
    height: 2189,
  },
});

const NotFoundPage = () => {
  return (
    <Layout>
      <PageNotFound />
    </Layout>
  );
};

export default NotFoundPage;
