"use client";

import { useState, type ReactNode } from "react";
import {
  AnimatedCollapse,
  Button,
  DisclosureCard,
  DropdownSelect,
  Heading,
  Modal,
} from "@ryanmeetup/ui";
import { useInstanceSettingsForm } from "@/hooks/useInstanceSettingsForm";
import {
  creditFields,
  creditWordingFields,
  footerTextFields,
  httpsOrNull,
  overridesFromDraft,
} from "@/lib/admin/instance-settings-fields";
import {
  resolveInstanceSettings,
  type InstanceFooterSection,
  type InstanceFooterSocial,
  type InstanceFooterVariant,
  type InstanceSettings,
  type InstanceSettingsOverrides,
} from "@/lib/instance";
import { FooterPreview } from "./FooterPreview";
import { FooterSectionsEditor } from "./FooterSectionsEditor";
import { FooterSocialsEditor } from "./FooterSocialsEditor";
import { InstanceSettingField } from "./InstanceSettingField";

const FORM_ID = "instance-footer-form";
const fields = [...footerTextFields, ...creditFields, ...creditWordingFields];

const footerVariantOptions = [
  { value: "branded", label: "Branded — wordmark, links, socials, credit" },
  { value: "minimal", label: "Minimal — one credit row" },
  { value: "none", label: "None — no footer" },
];

/** A titled block inside the dialog. The dialog title is the h2, so these are
 *  real `h3` headings and each owns the controls beneath it. */
function Subsection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Heading size="h3" className="text-base">
          {title}
        </Heading>
        <p className="mt-1 text-xs leading-relaxed text-black/55 dark:text-white/55">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

export function FooterSettingsModal({
  open,
  setOpen,
  overrides,
  demoMode,
  baseSettings,
  onSaved,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  overrides: InstanceSettingsOverrides | null;
  demoMode: boolean;
  baseSettings: InstanceSettings;
  onSaved: (overrides: InstanceSettingsOverrides) => void;
}) {
  const { draft, setField, errors, saving, submit } = useInstanceSettingsForm({
    fields,
    overrides,
    demoMode,
    onSaved,
  });
  const [variant, setVariant] = useState<InstanceFooterVariant | "">(
    (overrides?.footerVariant as InstanceFooterVariant) ?? "",
  );
  // Null means "no override stored", so the compiled list stands. Touching
  // either editor turns it into an explicit list.
  const [sections, setSections] = useState<InstanceFooterSection[] | null>(
    Array.isArray(overrides?.footerSections) ? overrides.footerSections : null,
  );
  const [socials, setSocials] = useState<InstanceFooterSocial[] | null>(
    Array.isArray(overrides?.footerSocials) ? overrides.footerSocials : null,
  );

  const resolvedVariant = variant || baseSettings.footerVariant;
  const resolvedSections = sections ?? baseSettings.footerSections;
  const resolvedSocials = socials ?? baseSettings.footerSocials;

  const preview = resolveInstanceSettings(
    {
      ...overrides,
      ...overridesFromDraft(draft),
      ...(variant ? { footerVariant: variant } : {}),
      ...(sections ? { footerSections: sections } : {}),
      ...(socials ? { footerSocials: socials } : {}),
    },
    baseSettings,
  );

  /**
   * The list editors accept partial rows while they are being filled in, so
   * completeness is checked at save time — but only for the parts the chosen
   * variant actually renders. A half-filled column left behind by switching to
   * `minimal` must not block the save on a field that is no longer on screen.
   */
  function footerProblem() {
    if (resolvedVariant === "none") return undefined;
    if (sections && resolvedVariant === "branded")
      for (const section of sections) {
        if (!section.title.trim())
          return "Every footer link column needs a heading.";
        for (const link of section.links)
          if (!link.label.trim() || !httpsOrNull(link.url))
            return `Every link under “${section.title}” needs a label and a full https:// address.`;
      }
    if (socials)
      for (const social of socials)
        if (!httpsOrNull(social.url))
          return "Every social link needs a full https:// address.";
    return undefined;
  }

  function structuralChanges() {
    const body: Record<string, unknown> = {};
    const nextVariant = variant || null;
    if (nextVariant !== (overrides?.footerVariant ?? null))
      body.footerVariant = nextVariant;
    const storedSections = Array.isArray(overrides?.footerSections)
      ? overrides.footerSections
      : null;
    if (JSON.stringify(sections) !== JSON.stringify(storedSections))
      body.footerSections = sections;
    const storedSocials = Array.isArray(overrides?.footerSocials)
      ? overrides.footerSocials
      : null;
    if (JSON.stringify(socials) !== JSON.stringify(storedSocials))
      body.footerSocials = socials;
    return body;
  }

  const renderField = (spec: (typeof fields)[number]) => (
    <InstanceSettingField
      key={spec.key}
      spec={spec}
      defaults={baseSettings}
      value={draft[spec.key]}
      error={errors[spec.key]}
      overridden={Boolean(draft[spec.key].trim())}
      disabled={saving}
      onChange={(value) => setField(spec.key, value)}
      onReset={() => setField(spec.key, "")}
    />
  );

  return (
    <Modal
      open={open}
      setIsOpen={setOpen}
      size="xl"
      title="Edit footer"
      description="Branded is a layout, not a preset: the wordmark line, link columns, socials, and credit sentence are all yours to fill in."
      closable={!saving}
      formId={FORM_ID}
      onSubmit={async (event) => {
        event.preventDefault();
        const saved = await submit({
          extraBody: structuralChanges(),
          extraError: footerProblem(),
        });
        if (saved) setOpen(false);
      }}
      hideActions
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            loading={saving}
            loadingText="Saving..."
          >
            Save footer
          </Button>
        </div>
      }
    >
      {/* Two columns: what the footer will look like and the one choice that
          changes its shape stay on the left, where the preview can stick while
          the editors on the right are scrolled. */}
      <div className="settings-form grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* The grid item stretches to the row height so the inner wrapper has
            somewhere to travel; making the item itself sticky would pin an
            element that already spans the row, which does nothing. */}
        <div>
          <div className="space-y-5 lg:sticky lg:top-2">
            <FooterPreview settings={preview} />

            <DropdownSelect
              label="Footer style"
              variant="field"
              disabled={saving}
              value={resolvedVariant}
              onChange={(value) => setVariant(value as InstanceFooterVariant)}
              options={footerVariantOptions}
            />
          </div>
        </div>

        <AnimatedCollapse open={resolvedVariant !== "none"}>
          <div className="space-y-8">
            <AnimatedCollapse open={resolvedVariant === "branded"}>
              <div className="space-y-8">
                <Subsection
                  title="Wordmark"
                  description="The oversized name and the line beneath it."
                >
                  {footerTextFields.map(renderField)}
                </Subsection>

                <Subsection
                  title="Link columns"
                  description="Up to three titled columns beside the wordmark."
                >
                  <FooterSectionsEditor
                    sections={resolvedSections}
                    setSections={setSections}
                    disabled={saving}
                  />
                </Subsection>
              </div>
            </AnimatedCollapse>

            <Subsection
              title="Social links"
              description="Icons beside the credit line. Add only the networks this instance actually uses."
            >
              <FooterSocialsEditor
                socials={resolvedSocials}
                setSocials={setSocials}
                disabled={saving}
              />
            </Subsection>

            <Subsection
              title="Credit"
              description="One sentence wrapped around a link."
            >
              <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 text-sm dark:border-white/10 dark:bg-white/[0.025]">
                <p className="text-black/70 dark:text-white/70">
                  {preview.creditPrefix}
                  <span className="font-semibold underline">
                    {preview.creditLabel}
                  </span>
                  {preview.creditSuffix}
                </p>
              </div>
              <div className="space-y-5">{creditFields.map(renderField)}</div>
              <DisclosureCard
                className="rounded-xl border border-black/10 bg-black/[0.015] p-3 dark:border-white/10 dark:bg-white/[0.025]"
                buttonClassName="flex w-full items-center justify-between gap-4 text-left"
                panelClassName="space-y-5 pt-4"
                iconClassName="h-3.5 w-3.5"
                summary={
                  <span className="text-sm font-semibold">
                    Change the wording around the link
                  </span>
                }
              >
                {creditWordingFields.map(renderField)}
              </DisclosureCard>
            </Subsection>
          </div>
        </AnimatedCollapse>
      </div>
    </Modal>
  );
}
