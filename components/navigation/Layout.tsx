"use client";

import { useState, useEffect } from "react";

// Components
import { Banner, Header, NewFooter } from "@/components/navigation";
import { FloatingCta } from "@/components/global";
import { IoBaseball as Baseball } from "react-icons/io5";
import { MdSportsSoccer as Soccer } from "react-icons/md";
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
        id="copa-del-ryan-rsvp"
        href="/rsvp"
        label="RSVP"
        sublabel="Copa del Ryan"
        secondarySublabel="6/26/26 &nbsp;•&nbsp; Brooklyn, NY"
        ariaLabel="RSVP to Copa del Ryan"
        hiddenRoutes={["/rsvp", "/awards", "/name-change"]}
        positionClassName="bottom-[max(7.25rem,calc(env(safe-area-inset-bottom)+7.25rem))] sm:bottom-[max(9.5rem,calc(env(safe-area-inset-bottom)+9.5rem))]"
        theme={{
          panel: "bg-[#234315]",
          border: "border-[#e9edc9] hover:border-[#f2f6d2]",
          text: "text-[#f4f4d2]",
          subtext: "text-[#f4f4d2]",
          iconPanel: "bg-[#e9edc9]",
          iconText: "text-[#234315]",
          dismissPanel:
            "border-[#e9edc9] bg-[#234315] text-[#f4f4d2] hover:border-[#f2f6d2]",
          glow: "bg-[radial-gradient(circle_at_top,_rgba(233,237,201,0.35),_transparent_60%)]",
          halo: "bg-[conic-gradient(from_180deg,_rgba(233,237,201,0.5),_rgba(244,244,210,0.12),_rgba(233,237,201,0.5))]",
          focusRing: "focus-visible:ring-[#e9edc9]/80",
        }}
        icon={<Soccer className="h-7 w-7 fill-current" />}
      />

      <FloatingCta
        id="rsvp"
        href="/rsvp"
        label="RSVP"
        sublabel="Ryan Baseball Classic"
        secondarySublabel="7/25/26 &nbsp;•&nbsp; Minneapolis, MN"
        ariaLabel="RSVP to upcoming events"
        hiddenRoutes={["/rsvp", "/awards", "/name-change"]}
        icon={<Baseball className="h-8 w-8 fill-current" />}
      />

      <NewFooter />
    </main>
  );
};

export { Layout };
