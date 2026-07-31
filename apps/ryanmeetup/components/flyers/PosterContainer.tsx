"use client";

// Components
import { Button } from "@/components/global";
import { FaDownload as Download } from "react-icons/fa";
import { Poster } from "@/components/flyers";

// Types
import type { Flyer, EventFlyer } from "@/lib/types";

// Utilities
import { convertImageUrl } from "@/utils/convert";

// Base props shared by both variants
type BaseProps = {
  title: string;
  download?: boolean;
  description: string;
};

// Discriminated union: `variant` determines the `flyers` element type
type NormalProps = BaseProps & {
  variant: "normal";
  flyers: Flyer[];
};

type EventProps = BaseProps & {
  variant: "event";
  flyers: EventFlyer[];
};

type PosterContainerProps = NormalProps | EventProps;

const PosterContainer = (props: PosterContainerProps) => {
  const { variant, flyers, download = false } = props;

  return (
    <div className="space-y-6">
      {download && (
        <Button
          onClick={() => window.open("/posters/posters.zip")}
          leftIcon={<Download />}
          className="mt-8 w-full"
        >
          Download Flyer Bundle
        </Button>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
        {variant === "normal" &&
          flyers.map((flyer, index) => (
            <Poster key={index} title={flyer.title} src={flyer.src} />
          ))}

        {variant === "event" &&
          flyers.map((flyer, index) => (
            <Poster
              key={index}
              title={flyer.title}
              src={convertImageUrl(flyer.src)!}
            />
          ))}
      </div>
    </div>
  );
};

export { PosterContainer };
