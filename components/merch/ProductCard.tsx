import Image from "next/image";

import { Button, Card, Heading, Kicker, Text } from "@/components/global";
import { formatShopifyMoney, type ShopifyProduct } from "@/lib/shopify";

import { ProductOptionSummary } from "./ProductOptionSummary";

type ProductCardProps = {
  product: ShopifyProduct;
};

const ProductCard = ({ product }: ProductCardProps) => {
  const image = product.featuredImage ?? product.images[0];

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0" hover>
      <div className="relative aspect-square overflow-hidden bg-black/5 dark:bg-white/5">
        {image ? (
          <Image
            alt={image.altText ?? product.title}
            className="object-cover"
            fill
            sizes="(min-width: 1280px) 28vw, (min-width: 768px) 42vw, 100vw"
            src={image.url}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <Text>No product image available yet.</Text>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-3">
          <Kicker>{product.availableForSale ? "Available now" : "Sold out"}</Kicker>
          <Heading className="title text-2xl" size="h2">
            {product.title}
          </Heading>
          <Text>
            {product.description || "Official Ryan Meetup merchandise."}
          </Text>
        </div>

        <ProductOptionSummary product={product} />

        <div className="mt-auto flex items-center justify-between gap-4">
          <p className="text-lg font-semibold tracking-wide text-black/85 dark:text-white/85">
            {formatShopifyMoney(product.priceRange.minVariantPrice)}
          </p>

          <Button.Link
            href={`/merch/products/${product.handle}`}
            newTab={false}
            variant="secondary"
          >
            View product
          </Button.Link>
        </div>
      </div>
    </Card>
  );
};

export { ProductCard };
