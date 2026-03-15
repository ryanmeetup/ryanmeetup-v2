// Utilities
import { redirect } from "next/navigation";

// Types
import { buildPageMetadata } from "@/utils/metadata";

type RedirectPageConfig = {
  url: string;
  metadata: Parameters<typeof buildPageMetadata>[0];
};

const createRedirectPage = (config: RedirectPageConfig) => {
  const { url, metadata } = config;

  const RedirectPage = () => {
    redirect(url);
  };

  return {
    metadata: buildPageMetadata(metadata),
    RedirectPage,
  };
};

export { createRedirectPage };
