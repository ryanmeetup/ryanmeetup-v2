import { forwardRef } from "react";

// Types
import type { ChangeEventHandler, InputHTMLAttributes, ReactNode } from "react";
import { fieldControlBaseClasses, getFieldLabelClasses } from "./fieldStyles";

export type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "type" | "onChange"
> & {
  label: string;
  name: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "url"
    | "number"
    | "date"
    | "time"
    | "datetime-local";
  onChange: ChangeEventHandler<HTMLInputElement>;
  ignoreColorMode?: boolean;
  leadingIcon?: ReactNode;
  trailingAction?: ReactNode;
  inputClassName?: string;
  error?: boolean;
  hideLabel?: boolean;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (props: InputProps, ref) => {
    const {
      label,
      name,
      type = "text",
      onChange,
      placeholder,
      required = false,
      ignoreColorMode = false,
      leadingIcon,
      trailingAction,
      inputClassName,
      error = false,
      hideLabel = false,
      ...rest
    } = props;

    const iconPadding = leadingIcon ? "pl-10" : "";
    const actionPadding = trailingAction ? "pr-12" : "";

    return (
      <div className="flex flex-col gap-2">
        <label
          className={`${hideLabel ? "sr-only" : getFieldLabelClasses(!ignoreColorMode)} ${error ? "!text-red-500 dark:!text-red-400" : ""}`}
          htmlFor={name}
        >
          <span>{label}</span>
          {required && <span className="shrink-0 text-red-500">*</span>}
        </label>
        <div className="relative">
          {leadingIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/70 dark:text-white/70">
              {leadingIcon}
            </span>
          )}
          {trailingAction && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {trailingAction}
            </div>
          )}
          <input
            className={`${fieldControlBaseClasses} ${error ? "border-red-500 ring-2 ring-red-500/20 focus:border-red-500 focus:ring-red-500/25 dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400/25" : ""} ${iconPadding} ${actionPadding} ${inputClassName ?? ""}`}
            id={name}
            name={name}
            placeholder={placeholder}
            onChange={onChange}
            required={required}
            aria-invalid={error || undefined}
            type={type}
            ref={ref}
            {...rest}
          />
        </div>
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
