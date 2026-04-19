type ShopifyConnection<T> = {
  nodes: T[];
};

type ShopifyMoney = {
  amount: string;
  currencyCode: string;
};

type ShopifyImage = {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

type ShopifyProductOption = {
  name: string;
  values: string[];
};

type ShopifySelectedOption = {
  name: string;
  value: string;
};

type ShopifyProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: ShopifyMoney;
  selectedOptions: ShopifySelectedOption[];
};

type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  availableForSale: boolean;
  featuredImage: ShopifyImage | null;
  images: ShopifyImage[];
  options: ShopifyProductOption[];
  priceRange: {
    minVariantPrice: ShopifyMoney;
    maxVariantPrice: ShopifyMoney;
  };
  variants: ShopifyProductVariant[];
};

type ShopifyProductsQuery = {
  products: ShopifyConnection<ShopifyProduct>;
};

type ShopifyProductQuery = {
  product: ShopifyProduct | null;
};

type ShopifyResponse<T> = {
  data?: T;
  errors?: Array<{
    message: string;
  }>;
};

const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_STOREFRONT_API_VERSION ?? "2025-10";

const normalizeShopifyDomain = (domain: string) =>
  domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

const getShopifyDomain = () => {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;

  return domain ? normalizeShopifyDomain(domain) : null;
};

const getShopifyAccessToken = () =>
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ?? null;

const productFragment = `
  id
  handle
  title
  description
  availableForSale
  featuredImage {
    url
    altText
    width
    height
  }
  images(first: 6) {
    nodes {
      url
      altText
      width
      height
    }
  }
  options {
    name
    values
  }
  priceRange {
    minVariantPrice {
      amount
      currencyCode
    }
    maxVariantPrice {
      amount
      currencyCode
    }
  }
  variants(first: 25) {
    nodes {
      id
      title
      availableForSale
      selectedOptions {
        name
        value
      }
      price {
        amount
        currencyCode
      }
    }
  }
`;

const shopifyFetch = async <T>(
  query: string,
  variables: Record<string, unknown> = {},
) => {
  const domain = getShopifyDomain();
  const accessToken = getShopifyAccessToken();

  if (!domain || !accessToken) {
    throw new Error(
      "Shopify storefront credentials are missing. Add SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN to .env.local.",
    );
  }

  const response = await fetch(
    `https://${domain}/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 300 },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Shopify Storefront API request failed with status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as ShopifyResponse<T>;

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(" "));
  }

  if (!payload.data) {
    throw new Error("Shopify Storefront API returned no data.");
  }

  return payload.data;
};

const getShopifyProducts = async (first = 12) => {
  const data = await shopifyFetch<ShopifyProductsQuery>(
    `
      query GetShopifyProducts($first: Int!) {
        products(first: $first, sortKey: CREATED_AT, reverse: true) {
          nodes {
            ${productFragment}
          }
        }
      }
    `,
    { first },
  );

  return data.products.nodes;
};

const getShopifyProduct = async (handle: string) => {
  const data = await shopifyFetch<ShopifyProductQuery>(
    `
      query GetShopifyProduct($handle: String!) {
        product(handle: $handle) {
          ${productFragment}
        }
      }
    `,
    { handle },
  );

  return data.product;
};

const formatShopifyMoney = (money: ShopifyMoney) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: money.currencyCode,
  }).format(Number(money.amount));

const isShopifyConfigured = () =>
  Boolean(getShopifyDomain() && getShopifyAccessToken());

const getShopifyStoreDomain = () => {
  const domain = getShopifyDomain();
  const accessToken = getShopifyAccessToken();

  if (!domain || !accessToken) {
    return null;
  }

  return domain;
};

const getShopifyConfigError = () => {
  const domain = getShopifyDomain();
  const accessToken = getShopifyAccessToken();

  if (!domain && !accessToken) {
    return null;
  }

  if (!domain) {
    return "Missing SHOPIFY_STORE_DOMAIN";
  }

  if (!accessToken) {
    return "Missing SHOPIFY_STOREFRONT_ACCESS_TOKEN";
  }

  return domain;
};

export {
  formatShopifyMoney,
  getShopifyConfigError,
  getShopifyProduct,
  getShopifyProducts,
  getShopifyStoreDomain,
  isShopifyConfigured,
  type ShopifyImage,
  type ShopifyMoney,
  type ShopifyProduct,
  type ShopifyProductOption,
  type ShopifyProductVariant,
};
