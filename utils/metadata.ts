import type { Metadata } from "next";

const SITE_NAME = "Ryan Meetup";
const SITE_URL = "https://ryanmeetup.com";

type MetadataImage = {
  url: string;
  width: number;
  height: number;
  alt?: string;
};

type MetadataOptions = {
  title: string;
  description: string;
  canonical: string;
  metadataBase?: string;
  image: MetadataImage;
  keywords?: string[];
  robots?: Metadata["robots"];
  siteName?: string;
};

const resolveMetadataUrl = (value: string, metadataBase = SITE_URL) => {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return new URL(value, metadataBase).toString();
};

const buildPageMetadata = (options: MetadataOptions): Metadata => {
  const {
    title,
    description,
    canonical,
    metadataBase,
    image,
    keywords,
    robots,
    siteName,
  } = options;
  const resolvedMetadataBase = metadataBase ?? SITE_URL;
  const resolvedCanonical = resolveMetadataUrl(canonical, resolvedMetadataBase);
  const resolvedImage = {
    ...image,
    url: resolveMetadataUrl(image.url, resolvedMetadataBase),
  };

  return {
    metadataBase: new URL(resolvedMetadataBase),
    title,
    description,
    keywords,
    robots,
    alternates: {
      canonical: resolvedCanonical,
    },
    openGraph: {
      url: resolvedCanonical,
      title,
      description,
      siteName: siteName ?? SITE_NAME,
      images: [resolvedImage],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [resolvedImage.url],
    },
  };
};

export { buildPageMetadata, SITE_NAME, SITE_URL };
