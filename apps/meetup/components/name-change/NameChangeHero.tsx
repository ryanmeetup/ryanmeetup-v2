// Components
import { Text } from "@/components/global";
import { Blurb } from "@/components/global";
import {
  FaRegFileLines as FormIcon,
  FaRegNewspaper as NewsIcon,
} from "react-icons/fa6";
import { contactHrefs } from "@/utils/contact";

const NameChangeHero = () => {
  return (
    <Blurb
      tag="Change your name to Ryan"
      fullHeadline="Name Change Paperwork"
      smallHeadline="Name Change Paperwork"
      href={contactHrefs.nameChangePaperwork}
      icon={<FormIcon className="h-4 w-4" />}
      hrefText="Request a form"
      secondaryHref="/newsletter"
      secondaryIcon={<NewsIcon className="h-4 w-4" />}
      secondaryHrefText="Get updates"
    >
      <Text className="secondary text-xl mb-6 xl:mx-32">
        One hub for every state. Choose your state to download the official
        name change paperwork.
      </Text>
    </Blurb>
  );
};

export { NameChangeHero };
