import { Card, Heading, Pill, Text } from "@/components/global";
import { ProductCard } from "@/components/merch";
import { Layout } from "@/components/navigation";
import {
  getShopifyConfigError,
  getShopifyProducts,
  getShopifyStoreDomain,
  isShopifyConfigured,
  type ShopifyProduct,
} from "@/lib/shopify";
import { buildPageMetadata } from "@/utils/metadata";

export const metadata = buildPageMetadata({
  title: "Ryan Meetup - Merch",
  description:
    "Browse official Ryan Meetup merchandise directly on ryanmeetup.com.",
  canonical: "https://ryanmeetup.com/merch",
  image: {
    url: "https://ryanmeetup.com/meta/merch.png",
    width: 2202,
    height: 1282,
  },
  keywords: [
    "ryan meetup merch",
    "ryan meetup store",
    "ryan meetup shirts",
    "ryan meetup gear",
  ],
});

const ShopifySetupCard = () => (
  <Card className="space-y-4" size="lg">
    <div className="space-y-2">
      <Heading className="title text-2xl" size="h2">
        Shopify connection needed
      </Heading>
      <Text>
        Add the Storefront API credentials to <code>.env.local</code> so this
        page can read the products already synced from Printful into Shopify.
      </Text>
    </div>

    <pre className="overflow-x-auto rounded-2xl border border-black/10 bg-black px-4 py-4 text-sm text-white dark:border-white/10">
{`SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-access-token
SHOPIFY_STOREFRONT_API_VERSION=2025-10`}
    </pre>
  </Card>
);

const ShopifyErrorCard = (props: { message: string }) => (
  <Card className="space-y-3" size="lg">
    <Heading className="title text-2xl" size="h2">
      Shopify products could not be loaded
    </Heading>
    <Text>{props.message}</Text>
  </Card>
);

const EmptyMerchCard = () => (
  <Card className="space-y-3" size="lg">
    <Heading className="title text-2xl" size="h2">
      No merch products are available yet
    </Heading>
    <Text>
      The Shopify connection is live, but no products were returned from the
      Storefront API. Check that the items are active and available to the
      storefront sales channel.
    </Text>
  </Card>
);

const MerchPage = async () => {
  let products: ShopifyProduct[] = [];
  let loadError: string | null = null;

  if (isShopifyConfigured()) {
    try {
      products = await getShopifyProducts();
    } catch (error) {
      loadError =
        error instanceof Error ? error.message : "Unknown Shopify error.";
    }
  }

  return (
    <Layout className="space-y-12">
      <section className="space-y-6 text-center">
        <div className="flex justify-center">
          <Pill>Merch</Pill>
        </div>

        <Heading className="title text-4xl sm:text-5xl lg:text-6xl" size="h1">
          Ryan Meetup Store
        </Heading>

        <Text className="mx-auto max-w-3xl text-lg">
          The storefront is now wired to Shopify. This first pass reads the
          live catalog already synced from Printful so we can shape the product
          experience directly inside the Ryan Meetup design system.
        </Text>
      </section>

      {!isShopifyConfigured() ? (
        <ShopifySetupCard />
      ) : loadError ? (
        <ShopifyErrorCard message={loadError} />
      ) : products.length === 0 ? (
        <EmptyMerchCard />
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      )}

      {isShopifyConfigured() && !loadError && products.length > 0 ? (
        <Card className="space-y-3" variant="solid">
          <Heading className="title text-2xl" size="h2">
            Shopify connection status
          </Heading>
          <Text>
            Pulling live catalog data from{" "}
            <code>{getShopifyStoreDomain() ?? "your Shopify store"}</code>.
          </Text>
          <Text>
            Next step is cart and checkout wiring against Shopify&apos;s
            Storefront API.
          </Text>
        </Card>
      ) : null}
    </Layout>
  );
};

export default MerchPage;
