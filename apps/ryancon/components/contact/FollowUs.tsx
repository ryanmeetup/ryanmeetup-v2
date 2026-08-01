import { Button, Divider, Kicker, SocialLinkGrid } from "@ryanmeetup/ui";
import { FaRegNewspaper as News } from "react-icons/fa";
import { socials } from "@/lib/constants";

const FollowUs = () => (
  <div className="col-span-2 text-black dark:text-white md:col-span-1">
    <Kicker className="mb-3 hidden xl:block">Follow RyanCon updates</Kicker>
    <SocialLinkGrid
      links={socials.map((outlet) => ({
        href: outlet.href,
        label: outlet.text,
        icon: outlet.icon,
      }))}
    />
    <Divider margins="lg" />
    <Button.Link
      href="https://ryanmeetup.com/newsletter"
      leftIcon={<News />}
      variant="primary"
      className="w-full"
    >
      <span className="sm:hidden">Join newsletter</span>
      <span className="hidden sm:inline">Sign up for our newsletter</span>
    </Button.Link>
  </div>
);

export { FollowUs };
