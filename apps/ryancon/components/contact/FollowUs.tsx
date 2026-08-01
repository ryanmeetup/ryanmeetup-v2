import { Button, Divider, SocialLinkGrid } from "@ryanmeetup/ui";
import { FaRegNewspaper as News } from "react-icons/fa";
import { socials } from "@/lib/constants";

const FollowUs = () => (
  <div className="col-span-2 text-black dark:text-white md:col-span-1">
    <SocialLinkGrid
      links={socials.map((outlet) => ({
        href: outlet.href,
        label: outlet.text,
        icon: outlet.icon,
      }))}
    />
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

export { FollowUs };
