import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@ryanmeetup/ui";
import { ProductDetail } from "@/components/product-detail";
import { Reviews } from "@/components/reviews";
import { formatMoney } from "@/lib/money";
import { StoreCollectionIcon, StoreHomeIcon, StoreProductIcon } from "@/lib/navigation";
import { getReviews } from "@/lib/reviews";
import { getProduct, getProductHandles } from "@/lib/shopify";

type Props = { params: Promise<{ handle: string }> };

export async function generateStaticParams() {
  return (await getProductHandles()).map((handle) => ({ handle }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).handle);
  if (!product) return { title: "Product not found" };
  return {
    title: product.title,
    description: product.description,
    openGraph: { images: product.featuredImage ? [{ url: product.featuredImage.url, alt: product.featuredImage.altText || product.title }] : [] },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).handle);
  if (!product) notFound();
  const reviews = await getReviews(product.id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://store.ryanmeetup.com";
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.map((image) => image.url),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: product.priceRange.minVariantPrice.currencyCode,
      lowPrice: product.priceRange.minVariantPrice.amount,
      offerCount: product.variants.length,
      availability: product.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteUrl}/products/${product.handle}`,
    },
    ...(reviews.count ? { aggregateRating: { "@type": "AggregateRating", ratingValue: reviews.averageRating.toFixed(1), reviewCount: reviews.count } } : {}),
  };
  return (
    <main className="store-container py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema).replace(/</g, "\\u003c") }} />
      <Breadcrumbs variant="compact" crumbs={[{ href: "/", title: "Store", icon: <StoreHomeIcon aria-hidden className="shrink-0" /> }, { href: "/collections/all", title: "All goods", icon: <StoreCollectionIcon aria-hidden className="shrink-0" /> }, { href: `/products/${product.handle}`, title: product.title, current: true, icon: <StoreProductIcon aria-hidden className="shrink-0" /> }]} />
      <div className="mt-8"><ProductDetail product={product} /></div>
      <Reviews data={reviews} productId={product.id} />
      <p className="sr-only">Price: {formatMoney(product.priceRange.minVariantPrice)}</p>
    </main>
  );
}
