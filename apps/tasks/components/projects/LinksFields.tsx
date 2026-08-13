"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button, DisclosureCard, IconButton, Input } from "@ryanmeetup/ui";
import { ensureHttpUrlScheme } from "@ryanmeetup/utils";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { CountBadge } from "@/components/global";
import type { ProjectLink } from "@/lib/types";

export function LinksFields({
  links,
  setLinks,
  disabled,
  namePrefix,
}: {
  links: ProjectLink[];
  setLinks: Dispatch<SetStateAction<ProjectLink[]>>;
  disabled: boolean;
  namePrefix: string;
}) {
  function update(index: number, field: keyof ProjectLink, value: string) {
    setLinks((current) =>
      current.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [field]: value } : link,
      ),
    );
  }

  return (
    <DisclosureCard
      defaultOpen
      collapsible={links.length > 0}
      className="rounded-xl border border-black/10 bg-black/[0.015] p-3 dark:border-white/10 dark:bg-white/[0.025]"
      buttonClassName="flex w-fit items-center gap-2 text-left"
      panelClassName="pt-3"
      iconClassName="h-3.5 w-3.5"
      description={
        <p className="pr-2 text-xs leading-relaxed text-black/55 dark:text-white/55">
          Attach docs, designs, folders, or any other helpful web page.
        </p>
      }
      actions={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<FiPlus aria-hidden />}
          className="shrink-0 px-3 py-1.5 normal-case tracking-normal"
          disabled={disabled || links.length >= 10}
          onClick={() =>
            setLinks((current) => [...current, { label: "", url: "" }])
          }
        >
          Add link
        </Button>
      }
      summary={
        <span className="flex items-center gap-2 text-sm font-semibold">
          Useful links
          {links.length > 0 && (
            <CountBadge>{links.length}</CountBadge>
          )}
        </span>
      }
    >
      <div className={links.length > 0 ? "space-y-2" : undefined}>
        {links.map((link, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-lg border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-black/10 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto] sm:items-end"
          >
            <Input
              label="Label"
              name={`${namePrefix}-link-label-${index}`}
              value={link.label}
              placeholder="Design file"
              maxLength={80}
              required
              disabled={disabled}
              onChange={(event) => update(index, "label", event.target.value)}
            />
            <Input
              label="URL"
              name={`${namePrefix}-link-url-${index}`}
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              value={link.url}
              placeholder="ryanmeetup.com"
              required
              disabled={disabled}
              onChange={(event) => update(index, "url", event.target.value)}
              onBlur={(event) =>
                update(index, "url", ensureHttpUrlScheme(event.target.value))
              }
            />
            <IconButton
              type="button"
              label={`Remove “${link.label || "link"}”`}
              disabled={disabled}
              onClick={() =>
                setLinks((current) =>
                  current.filter((_, linkIndex) => linkIndex !== index),
                )
              }
            >
              <FiTrash2 />
            </IconButton>
          </div>
        ))}
      </div>
    </DisclosureCard>
  );
}
