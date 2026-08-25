export type Money = {
  amount: string;
  currencyCode: string;
};

export type StoreImage = {
  altText: string | null;
  height: number | null;
  url: string;
  width: number | null;
};

export type SelectedOption = {
  name: string;
  value: string;
};

export type ProductVariant = {
  availableForSale: boolean;
  id: string;
  image: StoreImage | null;
  price: Money;
  selectedOptions: SelectedOption[];
  title: string;
};

export type ProductOption = {
  id: string;
  name: string;
  values: string[];
};

export type Product = {
  availableForSale: boolean;
  description: string;
  descriptionHtml: string;
  featuredImage: StoreImage | null;
  handle: string;
  id: string;
  images: StoreImage[];
  options: ProductOption[];
  priceRange: { minVariantPrice: Money };
  productType: string;
  tags: string[];
  title: string;
  variants: ProductVariant[];
};

export type CollectionSummary = {
  description: string;
  handle: string;
  id: string;
  image: StoreImage | null;
  title: string;
};

export type PageInfo = {
  endCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
};

export type ProductPage = {
  collection: CollectionSummary;
  pageInfo: PageInfo;
  products: Product[];
};

export type CartLine = {
  id: string;
  merchandise: ProductVariant & {
    product: Pick<Product, "handle" | "title">;
  };
  quantity: number;
};

export type Cart = {
  checkoutUrl: string;
  cost: { subtotalAmount: Money; totalAmount: Money };
  id: string;
  lines: CartLine[];
  totalQuantity: number;
};

export type Review = {
  body: string;
  createdAt: string;
  id: string;
  rating: number;
  reviewerName: string;
  title: string;
  verified: boolean;
};

export type ReviewsData = {
  averageRating: number;
  count: number;
  reviews: Review[];
};
