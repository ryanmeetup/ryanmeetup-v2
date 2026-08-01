"use client";

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

const buildSponsorTrackingHref = ({
  href,
  sponsorName,
  placement,
  partnershipType,
  source,
}: Omit<SponsorLinkProps, "className" | "children"> & { source: string }) => {
  const sponsorId = sponsorName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const params = new URLSearchParams({
    to: href,
    name: sponsorName,
    placement,
    type: partnershipType ?? "unknown",
    source,
  });
  return `/out/sponsor/${sponsorId}?${params.toString()}`;
};

const SponsorLink = (props: SponsorLinkProps) => {
  const { href, sponsorName, placement, partnershipType, className, children } =
    props;
  const pathname = usePathname();

  const trackingHref = buildSponsorTrackingHref({
    href,
    sponsorName,
    placement,
    partnershipType,
    source: pathname ?? "/",
  });

  return (
    <a href={trackingHref} className={className}>
      {children}
    </a>
  );
};

export { buildSponsorTrackingHref, SponsorLink };
