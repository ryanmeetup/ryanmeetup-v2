import { forwardRef } from "react";

// Types
import type { ChangeEvent } from "react";
import { fieldControlBaseClasses, getFieldLabelClasses } from "./fieldStyles";

type TextareaProps = {
  id: string;
  label: string;
  name: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (props: TextareaProps, ref) => {
    const {
      id,
      label,
      name,
      onChange,
      placeholder,
      required,
      rows = 5,
      ...rest
    } = props;

    return (
      <div className="flex flex-col gap-2">
        <label className={getFieldLabelClasses()} htmlFor={id}>
          <span>{label}</span>
          {required && <span className="shrink-0 text-red-500">*</span>}
        </label>
        <textarea
          className={fieldControlBaseClasses}
          id={id}
          name={name}
          placeholder={placeholder}
          onChange={onChange}
          required={required}
          rows={rows}
          {...rest}
          ref={ref}
        />
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
