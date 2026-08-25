import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, Button, SectionHeader } from "@ryanmeetup/ui";
import { FiArrowRight } from "react-icons/fi";
import { CollectionGrid } from "@/components/collection-grid";
import { getCollection, getCollections } from "@/lib/shopify";

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<{ after?: string }> };

export async function generateStaticParams() {
  return (await getCollections()).map((collection) => ({ handle: collection.handle }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const result = await getCollection(handle);
  if (!result) return { title: "Collection not found" };
  return { title: result.collection.title, description: result.collection.description };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const result = await getCollection(handle, query.after);
  if (!result) notFound();
  return (
    <main className="store-container py-10 sm:py-14">
      <Breadcrumbs variant="compact" crumbs={[{ href: "/", title: "Store" }, { href: `/collections/${handle}`, title: result.collection.title, current: true }]} />
      <SectionHeader className="mt-8" headingLevel="h1" title={result.collection.title} description={result.collection.description} meta={`${result.products.length} item${result.products.length === 1 ? "" : "s"}`} headingClassName="text-4xl sm:text-6xl" />
      <div className="mt-10"><CollectionGrid products={result.products} /></div>
      {result.pageInfo.hasNextPage && result.pageInfo.endCursor && (
        <div className="mt-10 flex justify-center"><Button.Link href={`/collections/${handle}?after=${encodeURIComponent(result.pageInfo.endCursor)}`} rightIcon={<FiArrowRight />}>Next page</Button.Link></div>
      )}
      {query.after && <div className="mt-4 text-center"><Link href={`/collections/${handle}`} className="text-sm font-semibold underline">Back to the first page</Link></div>}
    </main>
  );
}
