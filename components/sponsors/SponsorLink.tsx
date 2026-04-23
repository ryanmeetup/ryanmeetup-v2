"use client";

import NextLink from "next/link";
import { track } from "@vercel/analytics";
import { usePathname } from "next/navigation";

import type { ReactNode } from "react";

type SponsorLinkProps = {
  href: string;
  sponsorName: string;
  placement: string;
  partnershipType?: string;
  className?: string;
  children: ReactNode;
};

const SponsorLink = (props: SponsorLinkProps) => {
  const {
    href,
    sponsorName,
    placement,
    partnershipType,
    className,
    children,
  } = props;
  const pathname = usePathname();

  const sponsorId = sponsorName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return (
    <NextLink
      href={href}
      className={className}
      onClick={() => {
        if (typeof window === "undefined") {
          return;
        }

        const destination = new URL(href, window.location.origin);

        if (destination.origin === window.location.origin) {
          return;
        }

        track("sponsor_click", {
          sponsor_id: sponsorId,
          sponsor_name: sponsorName,
          sponsor_href: destination.toString(),
          sponsor_host: destination.hostname,
          source_path: pathname ?? "/",
          placement,
          partnership_type: partnershipType ?? "unknown",
        });
      }}
    >
      {children}
    </NextLink>
  );
};

export { SponsorLink };
