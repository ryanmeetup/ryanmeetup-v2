// Components
import {
  FaCircleInfo as About,
  FaThreads as Threads,
} from 'react-icons/fa6';
import {
  FaQuestion as FAQ,
  FaInstagram as Instagram,
  FaYoutube as YouTube,
  FaTiktok as TikTok,
} from 'react-icons/fa';
import { HiOutlineMail as Email } from 'react-icons/hi';
import { PiLetterCirclePBold as Party } from "react-icons/pi";
import { GoSponsorTiers as Sponsor } from "react-icons/go";
import { SiGithubsponsors as BecomeSponsor } from "react-icons/si";

const iconStyle = 'fill-white'

export const layoutPaddingX = "px-4 lg:px-32 2xl:px-56 3xl:px-[320px]"

export const leftRoutes = [
  {
    icon: <About className={iconStyle} />,
    text: 'About',
    href: '/about',
  },
  {
    icon: <FAQ className={iconStyle} />,
    text: 'FAQ',
    href: '/faqs',
  },
];

export const rightRoutes = [
  {
    icon: <Sponsor className={iconStyle} />,
    text: 'Sponsors',
    href: '/sponsors',
  },
  {
    icon: <BecomeSponsor className={iconStyle} />,
    text: 'Become a Sponsor',
    href: '/sponsorship',
  },
  {
    icon: <Email />,
    text: 'Contact',
    href: '/contact',
  },
];

export const socials = [
  {
    href: "https://www.instagram.com/ryanmeetup/",
    icon: <Instagram className="title" />,
    text: "Instagram",
  },
  {
    href: 'https://partiful.com/u/sJG4HpH0wS3ZA3YkzaL5',
    icon: <Party className="title" />,
    text: 'Partiful',
  },
  {
    href: "https://www.youtube.com/@ryanmeetup",
    icon: <YouTube className="title" />,
    text: "YouTube",
  },
  {
    icon: <TikTok className="title" />,
    text: "TikTok",
    href: "https://www.tiktok.com/@ryanmeetup/",
  },
  {
    icon: <Threads className="title" />,
    text: "Threads",
    href: "https://www.threads.net/@ryanmeetup",
  },
  // {
  //   icon: <Whatsapp className="title" />,
  //   text: "WhatsApp",
  //   href: "/whatsapp",
  // },
];

export const gallery = [
  // {
  //   imageUrl: "/group-photos/ryanroundup.png",
  //   title: "Ryan Roundup, March 2023",
  // },
  // {
  //   imageUrl: "/group-photos/rendez.webp",
  //   title: "Ryan Rendezvous, May 2023",
  // },
  // {
  //   imageUrl: "/group-photos/retreat.webp",
  //   title: "Ryan Retreat, July 2023",
  // },
  {
    imageUrl: "/group-photos/rave.webp",
    title: "Ryan Rave, September 2023",
  },
  // {
  //   imageUrl: "/group-photos/claus.webp",
  //   title: "Ryan Claus, December 2023",
  // },
  // {
  //   imageUrl: "/group-photos/rodeo.webp",
  //   title: "Ryan Rodeo, February 2024",
  // },
  {
    imageUrl: "/group-photos/stryan.webp",
    title: "St. Ryan's Day, March 2024",
  },
  // {
  //   imageUrl: "/group-photos/ryami.webp",
  //   title: "Ryami Vice, May 2024",
  // },
  // {
  //   imageUrl: "/group-photos/deadpoolgroup.webp",
  //   title: "150 Deadpools & Wolverine, July 2024",
  // },
  // {
  //   imageUrl: "/group-photos/royale.jpg",
  //   title: "Ryan Royale, September 2024",
  // },
  {
    imageUrl: "/group-photos/comedy.jpeg",
    title: "Last Ryan Standing, January 2025",
  },
  {
    imageUrl: "/group-photos/gameshow.jpg",
    title: "Ryan's Game Show, January 2025",
  },
  {
    imageUrl: "/group-photos/rockies.jpg",
    title: "Ryans @ Rockies, June 2025",
  },
  // {
  //   imageUrl: "/group-photos/summit.jpg",
  //   title: "Ryan Summit, June 2025",
  // },
  {
    imageUrl: "/group-photos/rytober.jpg",
    title: "Rytoberfest II, September 2025",
  },
  {
    imageUrl: "/group-photos/serhant.jpg",
    title: "Ryans Own Manhattan, December 2025",
  },
    {
    imageUrl: "/group-photos/stryan2.jpg",
    title: "St. Ryans Day II, March 2025",
  },
];