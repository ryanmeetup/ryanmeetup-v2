"use client";

// Components
import {
  FaInstagram as Instagram,
  FaYoutube as YouTube,
  FaWhatsapp as Whatsapp,
  FaTiktok as TikTok,
} from "react-icons/fa";
import { FaThreads as Threads } from "react-icons/fa6";
import { Divider, Text, Button } from "@/components/global";
import { FaRegNewspaper as News } from "react-icons/fa";
import { PiLetterCirclePBold as Party } from "react-icons/pi";

import NextLink from "next/link";

// Utilities
import { socials } from "@/lib/constants";

const FollowUs = () => {
  const iconStyle = "dark:fill-white h-8 w-8 fill-black";

  const renderIcon = (title: string) => {
    switch (title) {
      case "Instagram":
        return <Instagram className={iconStyle} />;
      case "YouTube":
        return <YouTube className={iconStyle} />;
      case "TikTok":
        return <TikTok className={iconStyle} />;
      case "Threads":
        return <Threads className={iconStyle} />;
      case "WhatsApp":
        return <Whatsapp className={iconStyle} />;
      case "Partiful":
        return <Party className={iconStyle} />;
      default:
        return;
    }
  };

  const renderWord = (title: string) => {
    switch (title) {
      case "Instagram":
        return "Follow";
      case "YouTube":
        return "Subscribe to";
      case "TikTok":
        return "Follow";
      case "Threads":
        return "Follow";
      case "WhatsApp":
        return "Join the conversation";
      case "Partiful":
        return "Follow"
      default:
        return;
    }
  };

  return (
    <div className="col-span-2 md:col-span-1 dark:text-white text-black">
      <div className="space-y-3">
        {socials.map((outlet) => (
          <NextLink
            href={outlet.href}
            key={outlet.text}
            className="flex space-x-4 timing hover:scale-102"
          >
            {renderIcon(outlet.text)}

            <Text className="text-lg secondary">
              {renderWord(outlet.text)} us on {outlet.text}
            </Text>
          </NextLink>
        ))}
      </div>

      <Divider />

      <Button.Link
        href="https://ryanmeetup.com/newsletter"
        leftIcon={<News />}
        variant="secondary"
        className="w-full"
      >
        <span className="sm:hidden">Join newsletter</span>
        <span className="hidden sm:inline">Sign up for our newsletter</span>
      </Button.Link>
    </div>
  );
};

export { FollowUs };
