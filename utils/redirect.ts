// Utilities
import { track } from "@vercel/analytics/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Types
import { buildPageMetadata } from "@/utils/metadata";

type RedirectPageConfig = {
  url: string;
  metadata: Parameters<typeof buildPageMetadata>[0];
};

const getRedirectPath = (canonical: string) => {
  try {
    return new URL(canonical).pathname;
  } catch {
    return canonical.startsWith("/") ? canonical : "/";
  }
};

const getRedirectEventName = (path: string) => {
  const key = path.replace(/^\/+/, "").replace(/[^a-zA-Z0-9_-]+/g, "_");

  return `redirect:${key || "home"}`;
};

const createRedirectPage = (config: RedirectPageConfig) => {
  const { url, metadata } = config;
  const redirectPath = getRedirectPath(metadata.canonical);
  const eventName = getRedirectEventName(redirectPath);
  const target = new URL(url);

  const RedirectPage = async () => {
    const requestHeaders = await headers();

    await track(
      eventName,
      {
        redirect_path: redirectPath,
        redirect_target: target.toString(),
        redirect_host: target.hostname,
        page_title: metadata.title,
      },
      { headers: requestHeaders },
    );

    redirect(url);
  };

  return {
    metadata: buildPageMetadata(metadata),
    RedirectPage,
  };
};

export { createRedirectPage };
