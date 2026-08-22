"use client";

import { Button, IconButton, Input } from "@ryanmeetup/ui";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { ResourceLinksFields } from "@/components/resources/ResourceLinksFields";
import type { InstanceFooterSection } from "@/lib/instance";

const MAX_SECTIONS = 3;

/**
 * The titled link columns of the branded footer. Sections are a list rather
 * than a fixed "Built with" group so the shape belongs to the layout and not
 * to whichever instance happened to define it first.
 */
export function FooterSectionsEditor({
  sections,
  setSections,
  disabled,
}: {
  sections: InstanceFooterSection[];
  setSections: (sections: InstanceFooterSection[]) => void;
  disabled: boolean;
}) {
  const update = (index: number, section: InstanceFooterSection) =>
    setSections(
      sections.map((current, at) => (at === index ? section : current)),
    );

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <div
          key={index}
          className="rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.025]"
        >
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label={`Column ${index + 1} heading`}
                name={`footer-section-title-${index}`}
                value={section.title}
                placeholder="e.g. Resources"
                maxLength={80}
                disabled={disabled}
                onChange={(event) =>
                  update(index, { ...section, title: event.target.value })
                }
              />
            </div>
            <IconButton
              type="button"
              label={`Remove the “${section.title || "untitled"}” column`}
              size="md"
              variant="danger"
              disabled={disabled}
              onClick={() =>
                setSections(sections.filter((_, at) => at !== index))
              }
            >
              <FiTrash2 />
            </IconButton>
          </div>

          <div className="mt-3">
            <ResourceLinksFields
              links={section.links}
              setLinks={(value) =>
                update(index, {
                  ...section,
                  links:
                    typeof value === "function" ? value(section.links) : value,
                })
              }
              disabled={disabled}
              namePrefix={`footer-section-${index}`}
              title="Links"
              hint="The links listed under this heading."
              addLabel="Add link"
              labelPlaceholder="e.g. Documentation"
              urlPlaceholder="e.g. example.com/docs"
              // Already inside a grouped card, so the editor drops its own
              // border rather than stacking a second one inside the first.
              className="rounded-lg border border-black/10 bg-transparent p-3 dark:border-white/10"
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        leftIcon={<FiPlus aria-hidden />}
        disabled={disabled || sections.length >= MAX_SECTIONS}
        onClick={() => setSections([...sections, { title: "", links: [] }])}
      >
        Add link column
      </Button>

      {sections.length === 0 && (
        <p className="text-xs text-black/55 dark:text-white/55">
          No link columns. The footer shows just the wordmark, socials, and
          credit.
        </p>
      )}
    </div>
  );
}
