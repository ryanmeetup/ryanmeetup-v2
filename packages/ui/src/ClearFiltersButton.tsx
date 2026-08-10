import type { ButtonHTMLAttributes } from "react";
import { FiX } from "react-icons/fi";
import { Button } from "./Button";

export type ClearFiltersButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  label?: string;
};

const ClearFiltersButton = ({
  className,
  label = "Clear filters",
  type = "button",
  ...props
}: ClearFiltersButtonProps) => (
  <Button
    {...props}
    type={type}
    variant="ghost"
    size="sm"
    leftIcon={<FiX aria-hidden />}
    className={`shrink-0 ${className ?? ""}`}
  >
    {label}
  </Button>
);

export { ClearFiltersButton };
