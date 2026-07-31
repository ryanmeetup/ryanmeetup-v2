"use client";

// Components
import { Header, Footer } from "@/components/navigation";
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

  return (
    <main>
      <Header />
      <section
        className={`${className}
                    text-white h-full flex flex-col dark:bg-black dark:text-white
                    ${"bg-white from-white bg-gradient-to-b from-neutral-00 to-neutral-200 to-neutral-00 dark:from-neutral-900 dark:to-black"}
                    ${fullscreen ? "bg-black" : `py-8 ${layoutPaddingX}`}`}
      >
        {children}
      </section>
      <Footer />
    </main>
  );
};

export { Layout };
