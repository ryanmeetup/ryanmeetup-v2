// Components
import { Heading, Card, Button } from "@/components/global";
import { FaDownload } from "react-icons/fa";

// Types
import { getNameChangeFormPath } from "@/components/name-change/regions";
import type { RegionItem } from "@/components/name-change/regions";

type RegionGridProps = {
  items: RegionItem[];
  region: "usa" | "canada";
};

const RegionGrid = (props: RegionGridProps) => {
  const { items, region } = props;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        const formPath = getNameChangeFormPath(item.name, region);

        return (
          <Card
            key={item.name}
            variant="soft"
            size="md"
            className="flex flex-col items-start gap-3"
          >
            <div className="flex w-full items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-black/5 text-black/70 dark:border-white/10 dark:bg-white/10 dark:text-white/80">
                <Icon className="h-5 w-5" />
              </span>
              <Heading
                className="min-w-0 flex-1 break-words text-lg title leading-snug"
                size="h3"
              >
                {item.name}
              </Heading>
            </div>
            {formPath ? (
              <Button.Link
                href={formPath}
                size="sm"
                variant="primary"
                className="w-full justify-center whitespace-nowrap"
                newTab={false}
                download
                leftIcon={<FaDownload className="h-4 w-4" />}
              >
                Download form
              </Button.Link>
            ) : (
              <Button.Link
                href="#"
                disabled
                size="sm"
                variant="secondary"
                className="w-full justify-center whitespace-nowrap"
              >
                Coming soon
              </Button.Link>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export { RegionGrid };
