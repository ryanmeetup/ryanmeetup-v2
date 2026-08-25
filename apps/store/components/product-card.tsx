import Image from "next/image";
import Link from "next/link";
import { Card, Kicker } from "@ryanmeetup/ui";
import { formatMoney } from "@/lib/money";
import type { Product } from "@/lib/types";

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  return (
    <Link href={`/products/${product.handle}`} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 dark:focus-visible:ring-white/40">
      <Card size="none" hover className="h-full overflow-hidden bg-white/65 dark:bg-white/5">
        <div className="relative aspect-[4/5] overflow-hidden bg-black/5 dark:bg-white/5">
          {product.featuredImage ? (
            <Image
              src={product.featuredImage.url}
              alt={product.featuredImage.altText || product.title}
              fill
              loading={eager ? "eager" : "lazy"}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full place-items-center font-cooper text-5xl text-black/10 dark:text-white/10">R</div>
          )}
          {!product.availableForSale && <span className="absolute left-3 top-3 rounded-full bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">Sold out</span>}
        </div>
        <div className="space-y-2 p-4 sm:p-5">
          <Kicker>{product.productType || "Ryan goods"}</Kicker>
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-cooper text-lg leading-tight tracking-wide text-black dark:text-white sm:text-xl">{product.title}</h3>
            <span className="shrink-0 text-sm font-semibold">{formatMoney(product.priceRange.minVariantPrice)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
