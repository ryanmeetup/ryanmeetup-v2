import { cloneElement, isValidElement } from "react";

// Components
import { Divider, Text, Button } from "@/components/global";
import { FaRegNewspaper as News } from "react-icons/fa";
import NextLink from "next/link";

// Utilities
import { socials } from "@/lib/constants";

const FollowUs = () => {
  const iconStyle = "dark:fill-white h-8 w-8 fill-black";

  const renderIcon = (icon: React.ReactNode) => {
    if (!isValidElement(icon)) return null;
    return cloneElement(icon, { className: iconStyle });
  };

  return (
    <div className="col-span-2 md:col-span-1 dark:text-white text-black">
      <div className="space-y-3">
        {socials.map((outlet) => (
          <NextLink
            href={outlet.href}
            key={outlet.text}
            className="flex space-x-4 timing hover:-translate-y-1 hover:underline"
          >
            {renderIcon(outlet.icon)}

            <Text className="text-lg secondary">
              {(outlet.ctaVerb ?? "Follow")} us on {outlet.text}
            </Text>
          </NextLink>
        ))}
      </div>

      <Divider />

      <Button.Link
        href="/newsletter"
        leftIcon={<News />}
        variant="primary"
        className="w-full"
      >
        <span className="sm:hidden">Join newsletter</span>
        <span className="hidden sm:inline">Sign up for our newsletter</span>
      </Button.Link>
    </div>
  );
};

export { FollowUs };
