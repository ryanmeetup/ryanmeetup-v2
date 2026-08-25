import Link from "next/link";
import { Button, Card, Heading, Kicker, SectionHeader, Text } from "@ryanmeetup/ui";
import { FiArrowRight, FiPackage, FiShield, FiTruck } from "react-icons/fi";
import { CollectionGrid } from "@/components/collection-grid";
import { getCollections, getFeaturedProducts } from "@/lib/shopify";

export const revalidate = 300;

export default async function HomePage() {
  const [collections, products] = await Promise.all([getCollections(), getFeaturedProducts()]);
  return (
    <main>
      <section className="store-container py-10 sm:py-16 lg:py-20">
        <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-[#e72a33] px-5 py-16 text-white shadow-xl sm:px-10 sm:py-22 lg:px-16 lg:py-28 dark:border-white/10">
          <div aria-hidden className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,white_1px,transparent_1.5px)] [background-size:18px_18px]" />
          <div className="relative max-w-4xl">
            <Kicker className="!text-white/80">Official Ryan provisions</Kicker>
            <Heading ignoreColorMode size="h1" className="mt-4 text-5xl leading-[0.95] text-white sm:text-7xl lg:text-8xl">Dress like everyone knows your name.</Heading>
            <Text className="mt-6 max-w-2xl text-lg text-white/85 sm:text-xl">Shirts, hats, and assorted goods for the world’s most organized first name.</Text>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button.Link href="/collections/all" size="lg" className="!w-full sm:!w-auto" rightIcon={<FiArrowRight />}>Shop everything</Button.Link>
              <Button.Link href="#collections" size="lg" variant="secondary" className="!w-full border-white/30 !bg-white/10 !text-white hover:!bg-white/20 sm:!w-auto">Browse collections</Button.Link>
            </div>
          </div>
          <span aria-hidden className="absolute -bottom-16 -right-4 hidden font-cooper text-[15rem] leading-none text-white/10 lg:block">R</span>
        </div>
      </section>

      <section className="store-container py-10 sm:py-14">
        <SectionHeader title="Ryan favorites" description="Popular picks, pulled straight from the official catalog." meta="Featured goods" />
        <div className="mt-8"><CollectionGrid products={products.slice(0, 8)} /></div>
      </section>

      <section id="collections" className="store-container py-12 sm:py-20">
        <SectionHeader title="Choose your department" description="There is no wrong aisle. There are only varying levels of Ryan." meta="Collections" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {collections.slice(0, 6).map((collection, index) => (
            <Link key={collection.id} href={`/collections/${collection.handle}`} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/40">
              <Card hover size="lg" className={`relative min-h-64 overflow-hidden ${index % 3 === 0 ? "!bg-nametag text-white" : "!bg-white/70 dark:!bg-white/5"}`}>
                <span className={`text-[10px] font-bold uppercase tracking-[0.25em] ${index % 3 === 0 ? "text-white/70" : "text-black/50 dark:text-white/50"}`}>Department {String(index + 1).padStart(2, "0")}</span>
                <Heading ignoreColorMode size="h3" className={`mt-14 text-3xl ${index % 3 === 0 ? "text-white" : "text-black dark:text-white"}`}>{collection.title}</Heading>
                <p className={`mt-3 text-sm leading-relaxed ${index % 3 === 0 ? "text-white/75" : "text-black/65 dark:text-white/65"}`}>{collection.description}</p>
                <FiArrowRight aria-hidden className="absolute bottom-6 right-6 text-2xl transition group-hover:translate-x-1" />
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-black/10 bg-white/45 dark:border-white/10 dark:bg-white/[0.025]">
        <div className="store-container grid gap-8 py-12 sm:grid-cols-3 sm:py-16">
          {[
            { icon: <FiPackage />, title: "Made for you", text: "Printful produces each order on demand." },
            { icon: <FiShield />, title: "Secure checkout", text: "Payment and tax are handled by Shopify." },
            { icon: <FiTruck />, title: "Tracked delivery", text: "Shipping updates arrive right in your inbox." },
          ].map((item) => (
            <div key={item.title} className="flex gap-4"><span className="mt-1 text-xl text-nametag">{item.icon}</span><div><h2 className="font-cooper text-xl tracking-wide">{item.title}</h2><Text className="mt-1 text-sm">{item.text}</Text></div></div>
          ))}
        </div>
      </section>
    </main>
  );
}
