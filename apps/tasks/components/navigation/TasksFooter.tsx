"use client";

import { SiteFooter, type SiteFooterLink } from "@ryanmeetup/ui";
import { usePathname } from "next/navigation";
import { useInstance } from "@/components/global";
import { socialIcons, socialLabels } from "@/lib/instance-socials";

const publicRoutes = new Set(["/forgot-password", "/login", "/reset-password"]);

/**
 * Every string in the footer comes from instance settings. The `branded`
 * variant is a layout — wordmark, subtitle, link columns, socials, credit —
 * not a reproduction of one organization's footer, so an instance fills it
 * with its own content or picks `minimal`/`none` instead.
 */
export function TasksFooter() {
  const instance = useInstance();
  const pathname = usePathname();

  if (instance.footerVariant === "none") return null;

  const socialLinks: SiteFooterLink[] = instance.footerSocials.map(
    ({ platform, url }) => ({
      href: url,
      icon: socialIcons[platform],
      label: socialLabels[platform],
    }),
  );
  const hasSidebar =
    !publicRoutes.has(pathname) && !pathname.startsWith("/auth/");

  return (
    <SiteFooter
      variant={instance.footerVariant === "minimal" ? "minimal" : "branded"}
      title={instance.name.toUpperCase()}
      subtitle={instance.footerSubtitle}
      className={`tasks-footer px-4 sm:px-6 lg:px-8 ${hasSidebar ? "lg:ml-64" : ""}`}
      sections={instance.footerSections.map((section) => ({
        title: section.title,
        columns: 2,
        links: section.links.map((link) => ({
          href: link.url,
          label: link.label,
        })),
      }))}
      socialLinks={socialLinks}
      credit={{
        href: instance.creditUrl,
        label: instance.creditLabel,
        prefix: instance.creditPrefix,
        suffix: instance.creditSuffix,
      }}
    />
  );
}
