"use client";

import { useState, useEffect } from "react";

// Components
import { Banner, Header, NewFooter } from "@/components/navigation";
import { FloatingCta } from "@/components/global";
import {
  FaCalendarAlt as Calendar,
  FaMapMarkerAlt as MapPin,
  FaTicketAlt as Ticket,
} from "react-icons/fa";
import { useTheme } from "next-themes";
import { layoutPaddingX } from "@/lib/constants";

// Types
import type { ReactNode } from "react";

type LayoutProps = {
  className?: string;
  children: ReactNode;
  fullscreen?: boolean;
};

const Layout = (props: LayoutProps) => {
  const { className, children, fullscreen = false } = props;

  const { theme } = useTheme();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <main>
      <Banner />
      <Header />
      <section
        className={`${className} 
                    text-white h-full flex flex-col dark:bg-black dark:text-white
                    ${isClient && theme === "light" ? "bg-[url('/crumbled.png')] bg-repeat bg-cover bg-white" : "bg-white from-white bg-gradient-to-b from-neutral-00 to-neutral-200 to-neutral-00 dark:from-neutral-900 dark:to-black"} 
                    ${fullscreen ? "bg-black" : `py-8 ${layoutPaddingX}`}`}
      >
        {children}
      </section>

      <FloatingCta
        id="upcoming-events-rsvp"
        href="/rsvp"
        label="RSVP"
        details={[
          {
            title: "Copa del Ryan",
            rows: [
              {
                icon: <Calendar className="h-3 w-3 fill-current" />,
                text: "June 26, 2026",
              },
              {
                icon: <MapPin className="h-3 w-3 fill-current" />,
                text: "Brooklyn, NY",
              },
            ],
          },
          {
            title: "Ryan Baseball Classic",
            rows: [
              {
                icon: <Calendar className="h-3 w-3 fill-current" />,
                text: "July 25, 2026",
              },
              {
                icon: <MapPin className="h-3 w-3 fill-current" />,
                text: "Minneapolis, MN",
              },
            ],
          },
        ]}
        ariaLabel="RSVP to upcoming events"
        hiddenRoutes={["/rsvp", "/awards", "/name-change"]}
        theme={{
          panel: "bg-[#1f1d1b]",
          border: "border-[#f4f4d2] hover:border-white",
          text: "text-[#f4f4d2]",
          subtext: "text-[#f4f4d2]/85",
          detailIcon: "text-[#d31145]",
          iconPanel: "bg-[#f4f4d2]",
          iconText: "text-[#1f1d1b]",
          dismissPanel:
            "border-[#f4f4d2] bg-[#1f1d1b] text-[#f4f4d2] hover:border-white",
          glow: "bg-[radial-gradient(circle_at_top,_rgba(211,17,69,0.24),_transparent_60%)]",
          halo: "bg-[conic-gradient(from_180deg,_rgba(244,244,210,0.44),_rgba(211,17,69,0.14),_rgba(244,244,210,0.44))]",
          focusRing: "focus-visible:ring-[#f4f4d2]/80",
        }}
        icon={<Ticket className="h-7 w-7 fill-current" />}
      />

      <NewFooter />
    </main>
  );
};

export { Layout };
