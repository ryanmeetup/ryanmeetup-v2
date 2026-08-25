import { NextResponse } from "next/server";

type ReviewSubmission = {
  body?: string;
  email?: string;
  name?: string;
  productId?: string;
  rating?: number;
  title?: string;
};

export async function POST(request: Request) {
  const token = process.env.JUDGEME_PRIVATE_API_TOKEN;
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!token || !shopDomain) {
    return NextResponse.json(
      { error: "Review submissions will open when Judge.me is connected." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as ReviewSubmission;
  if (
    !body.name?.trim() ||
    !body.email?.trim() ||
    !body.body?.trim() ||
    !body.productId ||
    !body.rating ||
    body.rating < 1 ||
    body.rating > 5
  ) {
    return NextResponse.json({ error: "Please complete every required field." }, { status: 400 });
  }

  const response = await fetch("https://judge.me/api/v1/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_token: token,
      shop_domain: shopDomain,
      platform: "shopify",
      id: body.productId.split("/").at(-1),
      name: body.name.trim(),
      email: body.email.trim(),
      rating: body.rating,
      title: body.title?.trim(),
      body: body.body.trim(),
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Judge.me could not accept that review." }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
