import { NextResponse } from "next/server";
import {
  addCartLine,
  createCart,
  isShopifyConfigured,
  removeCartLine,
  updateCartLine,
} from "@/lib/shopify";

type CartAction =
  | { action: "add"; cartId?: string; merchandiseId: string; quantity: number }
  | { action: "update"; cartId: string; lineId: string; quantity: number }
  | { action: "remove"; cartId: string; lineId: string };

export async function POST(request: Request) {
  if (!isShopifyConfigured()) {
    return NextResponse.json({ demo: true });
  }

  try {
    const body = (await request.json()) as CartAction;
    if (body.action === "add") {
      const cart = body.cartId
        ? await addCartLine(body.cartId, body.merchandiseId, body.quantity)
        : await createCart(body.merchandiseId, body.quantity);
      return NextResponse.json({ cart });
    }
    if (body.action === "update") {
      return NextResponse.json({
        cart: await updateCartLine(body.cartId, body.lineId, body.quantity),
      });
    }
    if (body.action === "remove") {
      return NextResponse.json({
        cart: await removeCartLine(body.cartId, body.lineId),
      });
    }
    return NextResponse.json({ error: "Unknown cart action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cart request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
