import { Text } from "@/components/global";
import type { ShopifyProduct } from "@/lib/shopify";

type ProductOptionSummaryProps = {
  product: ShopifyProduct;
};

const ProductOptionSummary = ({ product }: ProductOptionSummaryProps) => {
  const visibleOptions = product.options.filter((option) => {
    if (option.values.length === 0) {
      return false;
    }

    return !(option.values.length === 1 && option.values[0] === "Default Title");
  });

  if (visibleOptions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {visibleOptions.map((option) => (
        <Text key={option.name} className="text-sm">
          <span className="font-semibold uppercase tracking-[0.2em] text-black/80 dark:text-white/80">
            {option.name}:
          </span>{" "}
          {option.values.join(", ")}
        </Text>
      ))}
    </div>
  );
};

export { ProductOptionSummary };
