import type { ReviewsData } from "./types";

type JudgeMeReview = {
  body: string;
  created_at: string;
  id: number;
  rating: number;
  reviewer?: { name?: string };
  title?: string;
  verified?: string;
};

const emptyReviews: ReviewsData = {
  averageRating: 0,
  count: 0,
  reviews: [],
};

function shopifyNumericId(id: string) {
  return id.split("/").at(-1)?.replace(/^demo-/, "") ?? id;
}

export async function getReviews(productId: string): Promise<ReviewsData> {
  const token = process.env.JUDGEME_PRIVATE_API_TOKEN;
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!token || !shopDomain || productId.includes("/demo-")) return emptyReviews;

  const lookupUrl = new URL("https://api.judge.me/api/v1/products/-1");
  lookupUrl.searchParams.set("shop_domain", shopDomain);
  lookupUrl.searchParams.set("api_token", token);
  lookupUrl.searchParams.set("external_id", shopifyNumericId(productId));
  const productResponse = await fetch(lookupUrl, { next: { revalidate: 300 } });
  if (!productResponse.ok) return emptyReviews;
  const productPayload = (await productResponse.json()) as { product?: { id: number } };
  if (!productPayload.product?.id) return emptyReviews;

  const reviewsUrl = new URL("https://api.judge.me/api/v1/reviews");
  reviewsUrl.searchParams.set("shop_domain", shopDomain);
  reviewsUrl.searchParams.set("api_token", token);
  reviewsUrl.searchParams.set("product_id", String(productPayload.product.id));
  reviewsUrl.searchParams.set("published", "true");
  reviewsUrl.searchParams.set("per_page", "20");
  const reviewsResponse = await fetch(reviewsUrl, { next: { revalidate: 300 } });
  if (!reviewsResponse.ok) return emptyReviews;
  const payload = (await reviewsResponse.json()) as { reviews?: JudgeMeReview[] };
  const reviews = payload.reviews ?? [];

  return {
    count: reviews.length,
    averageRating: reviews.length
      ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
      : 0,
    reviews: reviews.map((review) => ({
      id: String(review.id),
      title: review.title ?? "",
      body: review.body,
      rating: review.rating,
      reviewerName: review.reviewer?.name ?? "Ryan customer",
      createdAt: review.created_at,
      verified: review.verified === "buyer" || review.verified === "verified-buyer",
    })),
  };
}
