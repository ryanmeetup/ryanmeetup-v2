// Utilities
import clsx from "clsx";

type DividerProps = {
  className?: string;
  margins?: "sm" | "md" | "lg" | "xl";
};

const Divider = (props: DividerProps) => {
  const { className = "", margins = "lg" } = props;

  const renderMargin = (margins: string) => {
    return clsx([
      margins === "xl" && "my-16",
      margins === "lg" && "my-8",
      margins === "md" && "my-4",
      margins === "sm" && "my-2",
    ]);
  };

  return (
    <div
      className={`${className} ${renderMargin(margins)} h-[1px] border-t border-gray-400 dark:border-gray-700`}
    />
  );
};

export { Divider };
