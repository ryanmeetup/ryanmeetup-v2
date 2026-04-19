import Image from "next/image";
import { notFound } from "next/navigation";

import { Button, Card, Heading, Pill, Text } from "@/components/global";
import { ProductOptionSummary } from "@/components/merch";
import { Layout } from "@/components/navigation";
import {
  formatShopifyMoney,
  getShopifyProduct,
  isShopifyConfigured,
} from "@/lib/shopify";
import { buildPageMetadata } from "@/utils/metadata";

type ProductPageProps = {
  params: {
    handle: string;
  };
};

export async function generateMetadata({ params }: ProductPageProps) {
  if (!isShopifyConfigured()) {
    return buildPageMetadata({
      title: "Ryan Meetup - Merch",
      description: "Official Ryan Meetup merchandise.",
      canonical: `https://ryanmeetup.com/merch/products/${params.handle}`,
      image: {
        url: "https://ryanmeetup.com/meta/merch.png",
        width: 2202,
        height: 1282,
      },
    });
  }

  let product = null;

  try {
    product = await getShopifyProduct(params.handle);
  } catch {
    product = null;
  }

  if (!product) {
    return buildPageMetadata({
      title: "Ryan Meetup - Merch",
      description: "Official Ryan Meetup merchandise.",
      canonical: `https://ryanmeetup.com/merch/products/${params.handle}`,
      image: {
        url: "https://ryanmeetup.com/meta/merch.png",
        width: 2202,
        height: 1282,
      },
    });
  }

  return buildPageMetadata({
    title: `Ryan Meetup - ${product.title}`,
    description:
      product.description || "Official Ryan Meetup merchandise available now.",
    canonical: `https://ryanmeetup.com/merch/products/${product.handle}`,
    image: {
      url: product.featuredImage?.url ?? "https://ryanmeetup.com/meta/merch.png",
      width: product.featuredImage?.width ?? 2202,
      height: product.featuredImage?.height ?? 1282,
    },
    keywords: [
      "ryan meetup merch",
      "ryan meetup store",
      product.title.toLowerCase(),
    ],
  });
}

const ProductPage = async ({ params }: ProductPageProps) => {
  if (!isShopifyConfigured()) {
    notFound();
  }

  const product = await getShopifyProduct(params.handle);

  if (!product) {
    notFound();
  }

  const priceLabel = formatShopifyMoney(product.priceRange.minVariantPrice);
  const images =
    product.images.length > 0
      ? product.images
      : product.featuredImage
        ? [product.featuredImage]
        : [];

  return (
    <Layout className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {images.length > 0 ? (
              images.map((image) => (
                <div
                  key={image.url}
                  className="relative aspect-square overflow-hidden rounded-3xl border border-black/10 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <Image
                    alt={image.altText ?? product.title}
                    className="object-cover"
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    src={image.url}
                  />
                </div>
              ))
            ) : (
              <Card className="flex aspect-square items-center justify-center text-center sm:col-span-2">
                <Text>No product imagery is available yet.</Text>
              </Card>
            )}
          </div>
        </div>

        <Card className="space-y-6" size="lg">
          <div className="space-y-4">
            <Pill>Merch Product</Pill>
            <Heading className="title text-4xl sm:text-5xl" size="h1">
              {product.title}
            </Heading>
            <Text className="text-xl font-semibold text-black/85 dark:text-white/85">
              {priceLabel}
            </Text>
            <Text className="whitespace-pre-line">
              {product.description || "Official Ryan Meetup merchandise."}
            </Text>
          </div>

          <ProductOptionSummary product={product} />

          <div className="grid gap-2 sm:grid-cols-2">
            {product.variants.map((variant) => (
              <div
                key={variant.id}
                className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-black/80 dark:text-white/80">
                  {variant.title}
                </p>
                <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                  {formatShopifyMoney(variant.price)}
                </p>
              </div>
            ))}
          </div>

          <Card className="space-y-3" variant="outline">
            <Text>
              Cart and checkout are the next integration step. For now, this
              page is reading your live Shopify product data so we can shape the
              storefront UX against real inventory.
            </Text>
            <Button.Link href="/merch" newTab={false} variant="secondary">
              Back to merch
            </Button.Link>
          </Card>
        </Card>
      </section>
    </Layout>
  );
};

export default ProductPage;
