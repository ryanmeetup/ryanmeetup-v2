"use client";

import { Button, DropdownSelect, IconButton, Input } from "@ryanmeetup/ui";
import { ensureHttpUrlScheme } from "@ryanmeetup/utils";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import {
  socialIcons,
  socialLabels,
  socialPlatformOptions,
} from "@/lib/instance-socials";
import { socialPlatforms, type InstanceFooterSocial } from "@/lib/instance";

/**
 * Social icons as a list, matching how footer links are edited. A per-network
 * input for each of Instagram, YouTube, GitHub, and LinkedIn made the four
 * Ryan Meetup happens to use look like the only ones that exist.
 */
export function FooterSocialsEditor({
  socials,
  setSocials,
  disabled,
}: {
  socials: InstanceFooterSocial[];
  setSocials: (socials: InstanceFooterSocial[]) => void;
  disabled: boolean;
}) {
  const used = new Set(socials.map((social) => social.platform));
  const unused = socialPlatforms.filter((platform) => !used.has(platform));

  const update = (index: number, social: InstanceFooterSocial) =>
    setSocials(socials.map((current, at) => (at === index ? social : current)));

  return (
    <div className="space-y-2">
      {socials.map((social, index) => (
        <div
          key={index}
          className="flex items-end gap-2 rounded-lg border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-black/10"
        >
          <span
            aria-hidden
            className="grid h-11 w-9 shrink-0 place-items-center text-lg text-black/60 dark:text-white/60"
          >
            {socialIcons[social.platform]}
          </span>
          <div className="w-32 shrink-0">
            <DropdownSelect
              label="Network"
              variant="field"
              disabled={disabled}
              value={social.platform}
              onChange={(value) =>
                update(index, {
                  ...social,
                  platform: value as InstanceFooterSocial["platform"],
                })
              }
              // Only this row's own network plus the ones nothing else claims,
              // so the footer cannot end up with two of the same icon.
              options={socialPlatformOptions.filter(
                (option) =>
                  option.value === social.platform ||
                  !used.has(option.value),
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <Input
              label="URL"
              name={`footer-social-url-${index}`}
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              value={social.url}
              placeholder={`e.g. ${socialLabels[social.platform].toLowerCase()}.com/yourhandle`}
              maxLength={2048}
              disabled={disabled}
              onChange={(event) =>
                update(index, { ...social, url: event.target.value })
              }
              onBlur={(event) =>
                update(index, {
                  ...social,
                  url: ensureHttpUrlScheme(event.target.value),
                })
              }
            />
          </div>
          <IconButton
            type="button"
            label={`Remove ${socialLabels[social.platform]}`}
            size="md"
            variant="danger"
            disabled={disabled}
            onClick={() => setSocials(socials.filter((_, at) => at !== index))}
          >
            <FiTrash2 />
          </IconButton>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        leftIcon={<FiPlus aria-hidden />}
        disabled={disabled || unused.length === 0}
        onClick={() =>
          unused[0] && setSocials([...socials, { platform: unused[0], url: "" }])
        }
      >
        Add social link
      </Button>

      {socials.length === 0 && (
        <p className="text-xs text-black/55 dark:text-white/55">
          No social icons in the footer.
        </p>
      )}
    </div>
  );
}
