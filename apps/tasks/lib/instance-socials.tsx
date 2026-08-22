import type { ReactNode } from "react";
import {
  FaFacebook,
  FaGithub,
  FaGlobe,
  FaInstagram,
  FaLinkedin,
  FaTiktok,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { socialPlatforms, type InstanceSocialPlatform } from "@/lib/instance";

/**
 * Presentation for each social platform an instance can list in its footer.
 *
 * Settings store the platform key rather than a per-network column, so adding
 * a network means adding it to `socialPlatforms` and to both maps here — no
 * migration, and no new form field.
 */
export const socialIcons: Record<InstanceSocialPlatform, ReactNode> = {
  instagram: <FaInstagram className="title" />,
  youtube: <FaYoutube className="title" />,
  github: <FaGithub className="title" />,
  linkedin: <FaLinkedin className="title" />,
  x: <FaXTwitter className="title" />,
  facebook: <FaFacebook className="title" />,
  tiktok: <FaTiktok className="title" />,
  website: <FaGlobe className="title" />,
};

export const socialLabels: Record<InstanceSocialPlatform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  github: "GitHub",
  linkedin: "LinkedIn",
  x: "X",
  facebook: "Facebook",
  tiktok: "TikTok",
  website: "Website",
};

/** Options for the platform picker, in the order declared by the model. */
export const socialPlatformOptions = socialPlatforms.map((platform) => ({
  value: platform,
  label: socialLabels[platform],
}));
