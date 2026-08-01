import type { SVGAttributes } from "react";

export type SpinnerProps = SVGAttributes<SVGSVGElement> & {
  label?: string;
  size?: number | string;
};

const Spinner = ({
  label = "Loading",
  size = 20,
  className,
  ...props
}: SpinnerProps) => (
  <svg
    {...props}
    role="status"
    aria-label={label}
    width={size}
    height={size}
    className={`animate-spin fill-current text-current ${className ?? ""}`}
    viewBox="0 0 100 101"
  >
    <path
      className="opacity-25"
      d="M100 50.6A50 50 0 1 1 50 0a50 50 0 0 1 50 50.6Z"
      fill="currentColor"
    />
    <path
      className="opacity-75"
      d="M93.97 39.04A50 50 0 0 0 54.9.24v10.08a40 40 0 0 1 29.35 28.72h9.72Z"
      fill="currentColor"
    />
  </svg>
);

export { Spinner };
