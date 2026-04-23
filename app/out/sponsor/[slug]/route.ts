import { track } from "@vercel/analytics/server";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ slug: string }> | { slug: string };
};

const getSearchParam = (request: Request, key: string) => {
  return new URL(request.url).searchParams.get(key);
};

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await Promise.resolve(context.params);
  const destination = getSearchParam(request, "to");
  const sponsorName = getSearchParam(request, "name") ?? slug;
  const placement = getSearchParam(request, "placement") ?? "unknown";
  const partnershipType = getSearchParam(request, "type") ?? "unknown";
  const sourcePath = getSearchParam(request, "source") ?? "/";

  if (!destination) {
    return NextResponse.redirect(new URL("/sponsors", request.url), 302);
  }

  let targetUrl: URL;

  try {
    targetUrl = new URL(destination);
  } catch {
    return NextResponse.redirect(new URL("/sponsors", request.url), 302);
  }

  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    return NextResponse.redirect(new URL("/sponsors", request.url), 302);
  }

  await track(`sponsor_click:${slug}`, {
    sponsor_id: slug,
    sponsor_name: sponsorName,
    sponsor_href: targetUrl.toString(),
    sponsor_host: targetUrl.hostname,
    source_path: sourcePath,
    placement,
    partnership_type: partnershipType,
  });

  return NextResponse.redirect(targetUrl, 302);
}
