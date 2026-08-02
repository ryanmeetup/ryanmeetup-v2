import type { ReactNode } from "react";
import { Kicker } from "./Kicker";
import { Text } from "./Text";
import { ErrorCallout } from "./ErrorCallout";

export type FieldErrorProps = { children?: ReactNode; className?: string };
const FieldError = ({ children, className }: FieldErrorProps) =>
  children ? (
    <ErrorCallout className={`mt-2 ${className ?? ""}`}>
      {children}
    </ErrorCallout>
  ) : null;

export type FormStatusProps = {
  title: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
};
const FormStatus = ({ title, children, icon, className }: FormStatusProps) => (
  <div
    className={`grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-black/10 bg-white/90 p-4 shadow-lg dark:border-white/15 dark:bg-black/80 ${className ?? ""}`}
  >
    {icon && <div className="flex items-center">{icon}</div>}
    <div>
      <div className="text-lg font-cooper">{title}</div>
      {children && <Text className="text-sm">{children}</Text>}
    </div>
  </div>
);

const RequiredFieldsNote = ({
  children = "All fields required",
}: {
  children?: ReactNode;
}) => <Kicker>{children}</Kicker>;
const FormActions = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end ${className ?? ""}`}
  >
    {children}
  </div>
);

export { FieldError, FormActions, FormStatus, RequiredFieldsNote };
