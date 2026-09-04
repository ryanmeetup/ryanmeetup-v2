// Components
import { Button, Divider, Kicker, SocialLinkGrid } from "@ryanmeetup/ui";
import { FaRegNewspaper as News } from "react-icons/fa";

// Utilities
import { socials } from "@/lib/constants";

const FollowUs = () => {
  return (
    <div className="col-span-2 md:col-span-1 dark:text-white text-black">
      <Kicker className="mb-3 hidden xl:block">Find us online</Kicker>
      <SocialLinkGrid
        links={socials.map((outlet) => ({
          href: outlet.href,
          label: outlet.text,
          icon: outlet.icon,
          ctaVerb: outlet.ctaVerb,
        }))}
      />

      <Divider margins="lg" />

      <Button.Link
        href="/newsletter"
        size="md"
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
