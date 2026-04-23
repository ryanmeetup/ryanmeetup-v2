"use client";

import NextLink from "next/link";
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
      href={{
        pathname: `/out/sponsor/${sponsorId}`,
        query: {
          to: href,
          name: sponsorName,
          placement,
          type: partnershipType ?? "unknown",
          source: pathname ?? "/",
        },
      }}
      className={className}
    >
      {children}
    </NextLink>
  );
};

export { SponsorLink };
