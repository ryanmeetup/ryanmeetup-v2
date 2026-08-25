import { demoCollections, demoProducts } from "./demo-data";
import type {
  Cart,
  CollectionSummary,
  Product,
  ProductPage,
  ProductVariant,
  StoreImage,
} from "./types";

const apiVersion = "2026-04";

type Edge<T> = { node: T };
type Connection<T> = { edges: Edge<T>[] };
type ProductNode = Omit<Product, "images" | "variants"> & {
  images: Connection<StoreImage>;
  variants: Connection<ProductVariant>;
};
type CollectionNode = CollectionSummary & {
  products?: Connection<ProductNode> & {
    pageInfo: ProductPage["pageInfo"];
  };
};

const productFragment = `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    descriptionHtml
    availableForSale
    productType
    tags
    featuredImage { url altText width height }
    images(first: 12) { edges { node { url altText width height } } }
    priceRange { minVariantPrice { amount currencyCode } }
    options { id name values }
    variants(first: 100) {
      edges {
        node {
          id
          title
          availableForSale
          price { amount currencyCode }
          image { url altText width height }
          selectedOptions { name value }
        }
      }
    }
  }
`;

const cartFragment = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              availableForSale
              price { amount currencyCode }
              image { url altText width height }
              selectedOptions { name value }
              product { handle title }
            }
          }
        }
      }
    }
  }
`;

export function isShopifyConfigured() {
  return Boolean(
    process.env.SHOPIFY_STORE_DOMAIN &&
      process.env.SHOPIFY_STOREFRONT_API_TOKEN,
  );
}

function normalizeDomain(domain: string) {
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

async function storefrontRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  options: { revalidate?: number } = {},
): Promise<T> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

  if (!domain || !token) {
    throw new Error("Shopify is not configured.");
  }

  const response = await fetch(
    `https://${normalizeDomain(domain)}/api/${apiVersion}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
      next: options.revalidate
        ? { revalidate: options.revalidate, tags: ["shopify-catalog"] }
        : undefined,
      cache: options.revalidate ? undefined : "no-store",
    },
  );

  const payload = (await response.json()) as {
    data?: T;
    errors?: { message: string }[];
  };

  if (!response.ok || payload.errors?.length || !payload.data) {
    const message = payload.errors?.map((error) => error.message).join("; ");
    throw new Error(message || `Shopify request failed (${response.status}).`);
  }

  return payload.data;
}

function reshapeProduct(product: ProductNode): Product {
  return {
    ...product,
    images: product.images.edges.map(({ node }) => node),
    variants: product.variants.edges.map(({ node }) => node),
  };
}

export async function getCollections(): Promise<CollectionSummary[]> {
  if (!isShopifyConfigured()) return demoCollections;

  const data = await storefrontRequest<{
    collections: Connection<CollectionSummary>;
  }>(
    `query Collections { collections(first: 20, sortKey: TITLE) { edges { node { id handle title description image { url altText width height } } } } }`,
    {},
    { revalidate: 300 },
  );
  return data.collections.edges.map(({ node }) => node);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  if (!isShopifyConfigured()) return demoProducts;

  const data = await storefrontRequest<{ products: Connection<ProductNode> }>(
    `${productFragment}
      query FeaturedProducts {
        products(first: 8, sortKey: BEST_SELLING) {
          edges { node { ...ProductFields } }
        }
      }`,
    {},
    { revalidate: 300 },
  );
  return data.products.edges.map(({ node }) => reshapeProduct(node));
}

export async function getProductHandles(): Promise<string[]> {
  if (!isShopifyConfigured()) return demoProducts.map((product) => product.handle);

  const data = await storefrontRequest<{
    products: Connection<{ handle: string }>;
  }>(
    `query ProductHandles { products(first: 250, sortKey: TITLE) { edges { node { handle } } } }`,
    {},
    { revalidate: 300 },
  );
  return data.products.edges.map(({ node }) => node.handle);
}

export async function getCollection(
  handle: string,
  after?: string,
): Promise<ProductPage | null> {
  if (!isShopifyConfigured()) {
    const collection = demoCollections.find((item) => item.handle === handle);
    if (!collection) return null;
    const products =
      handle === "all"
        ? demoProducts
        : demoProducts.filter((product) =>
            handle === "apparel"
              ? product.productType !== "Accessories"
              : product.productType === "Accessories",
          );
    return {
      collection,
      products,
      pageInfo: {
        endCursor: null,
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
      },
    };
  }

  const data = await storefrontRequest<{
    collection: CollectionNode | null;
  }>(
    `${productFragment}
      query Collection($handle: String!, $after: String) {
        collection(handle: $handle) {
          id handle title description image { url altText width height }
          products(first: 12, after: $after, sortKey: COLLECTION_DEFAULT) {
            pageInfo { endCursor hasNextPage hasPreviousPage startCursor }
            edges { node { ...ProductFields } }
          }
        }
      }`,
    { handle, after: after || null },
    { revalidate: 300 },
  );

  if (!data.collection?.products) return null;
  const { products, ...collection } = data.collection;
  return {
    collection,
    products: products.edges.map(({ node }) => reshapeProduct(node)),
    pageInfo: products.pageInfo,
  };
}

export async function getProduct(handle: string): Promise<Product | null> {
  if (!isShopifyConfigured()) {
    return demoProducts.find((product) => product.handle === handle) ?? null;
  }

  const data = await storefrontRequest<{ product: ProductNode | null }>(
    `${productFragment}
      query Product($handle: String!) {
        product(handle: $handle) { ...ProductFields }
      }`,
    { handle },
    { revalidate: 300 },
  );
  return data.product ? reshapeProduct(data.product) : null;
}

function reshapeCart(raw: Omit<Cart, "lines"> & { lines: Connection<Cart["lines"][number]> }): Cart {
  return { ...raw, lines: raw.lines.edges.map(({ node }) => node) };
}

type CartPayload = {
  cart: (Omit<Cart, "lines"> & { lines: Connection<Cart["lines"][number]> }) | null;
  userErrors: { message: string }[];
};

function readCartPayload(payload: CartPayload): Cart {
  if (payload.userErrors.length) {
    throw new Error(payload.userErrors.map((error) => error.message).join("; "));
  }
  if (!payload.cart) throw new Error("Shopify did not return a cart.");
  return reshapeCart(payload.cart);
}

export async function createCart(merchandiseId: string, quantity: number) {
  const data = await storefrontRequest<{ cartCreate: CartPayload }>(
    `${cartFragment}
      mutation CartCreate($input: CartInput!) {
        cartCreate(input: $input) { cart { ...CartFields } userErrors { message } }
      }`,
    { input: { lines: [{ merchandiseId, quantity }] } },
  );
  return readCartPayload(data.cartCreate);
}

export async function addCartLine(cartId: string, merchandiseId: string, quantity: number) {
  const data = await storefrontRequest<{ cartLinesAdd: CartPayload }>(
    `${cartFragment}
      mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ...CartFields } userErrors { message } }
      }`,
    { cartId, lines: [{ merchandiseId, quantity }] },
  );
  return readCartPayload(data.cartLinesAdd);
}

export async function updateCartLine(cartId: string, lineId: string, quantity: number) {
  const data = await storefrontRequest<{ cartLinesUpdate: CartPayload }>(
    `${cartFragment}
      mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ...CartFields } userErrors { message } }
      }`,
    { cartId, lines: [{ id: lineId, quantity }] },
  );
  return readCartPayload(data.cartLinesUpdate);
}

export async function removeCartLine(cartId: string, lineId: string) {
  const data = await storefrontRequest<{ cartLinesRemove: CartPayload }>(
    `${cartFragment}
      mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ...CartFields } userErrors { message } }
      }`,
    { cartId, lineIds: [lineId] },
  );
  return readCartPayload(data.cartLinesRemove);
}
