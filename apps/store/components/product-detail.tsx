"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, DropdownSelect, ErrorCallout, FormStatus, Kicker } from "@ryanmeetup/ui";
import { FiCheck, FiShoppingBag } from "react-icons/fi";
import { formatMoney } from "@/lib/money";
import type { Product } from "@/lib/types";
import { useCart } from "./cart-provider";

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem, error, loading } = useCart();
  const initialVariant = product.variants.find((variant) => variant.availableForSale) ?? product.variants[0];
  const [selections, setSelections] = useState<Record<string, string>>(
    Object.fromEntries(initialVariant?.selectedOptions.map((option) => [option.name, option.value]) ?? []),
  );
  const [quantity, setQuantity] = useState("1");
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(product.featuredImage ?? product.images[0] ?? null);
  const variant = useMemo(
    () =>
      product.variants.find((item) =>
        item.selectedOptions.every((option) => selections[option.name] === option.value),
      ) ?? initialVariant,
    [initialVariant, product.variants, selections],
  );

  async function handleAdd() {
    if (!variant?.availableForSale) return;
    await addItem(product, variant, Number(quantity));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:gap-12">
      <div className="space-y-4">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5">
          {activeImage ? <Image src={activeImage.url} alt={activeImage.altText || product.title} fill preload sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover" /> : <div className="grid h-full place-items-center font-cooper text-8xl text-black/10 dark:text-white/10">R</div>}
        </div>
        {product.images.length > 1 && (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {product.images.map((image) => (
              <button key={image.url} type="button" onClick={() => setActiveImage(image)} aria-label={`View ${image.altText || product.title}`} className={`relative aspect-square overflow-hidden rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 ${activeImage?.url === image.url ? "border-black dark:border-white" : "border-black/10 dark:border-white/10"}`}>
                <Image src={image.url} alt="" fill sizes="120px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="lg:sticky lg:top-28 lg:self-start">
        <Kicker>{product.productType || "Official Ryan goods"}</Kicker>
        <h1 className="mt-3 font-cooper text-4xl leading-[1.05] tracking-wide text-black dark:text-white sm:text-5xl">{product.title}</h1>
        <p className="mt-5 text-xl font-semibold">{variant ? formatMoney(variant.price) : formatMoney(product.priceRange.minVariantPrice)}</p>
        <p className="mt-6 leading-relaxed text-black/70 dark:text-white/70">{product.description}</p>

        <div className="mt-8 space-y-5">
          {product.options.map((option) => (
            <DropdownSelect
              key={option.id}
              label={option.name}
              variant="field"
              required
              value={selections[option.name] ?? option.values[0]}
              onChange={(value) => setSelections((current) => ({ ...current, [option.name]: value }))}
              options={option.values.map((value) => {
                const available = product.variants.some((item) => item.availableForSale && item.selectedOptions.some((selected) => selected.name === option.name && selected.value === value));
                return { label: available ? value : `${value} — sold out`, value };
              })}
            />
          ))}
          <DropdownSelect
            label="Quantity"
            variant="field"
            required
            value={quantity}
            onChange={setQuantity}
            options={[1, 2, 3, 4, 5].map((value) => ({ label: String(value), value: String(value) }))}
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Button fullWidth size="lg" loading={loading} loadingText="Adding" disabled={!variant?.availableForSale} leftIcon={added ? <FiCheck /> : <FiShoppingBag />} onClick={handleAdd}>
            {!variant?.availableForSale ? "Sold out" : added ? "Added" : "Add to cart"}
          </Button>
          <Button fullWidth size="lg" variant="secondary" onClick={() => router.push("/cart")}>View cart</Button>
        </div>
        {error && <ErrorCallout className="mt-4">{error}</ErrorCallout>}
        {added && <FormStatus className="mt-4" title="Added to cart" icon={<FiCheck aria-hidden />}>Excellent choice, Ryan. It’s in your cart.</FormStatus>}
        <div className="mt-8 grid gap-3 border-t border-black/10 pt-6 text-sm text-black/65 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 dark:border-white/10 dark:text-white/65">
          <p><strong className="block text-black dark:text-white">Made to order</strong>Printed by Printful</p>
          <p><strong className="block text-black dark:text-white">Secure checkout</strong>Hosted by Shopify</p>
          <p><strong className="block text-black dark:text-white">Ryan approved</strong>Obviously</p>
        </div>
      </div>
    </div>
  );
}
