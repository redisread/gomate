import { Label } from "@/components/starwind-react/label";
import type { ReactNode } from "react";

export interface FieldGroupProps {
  icon?: ReactNode;
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export function FieldGroup({
  icon,
  label,
  htmlFor,
  required,
  hint,
  children,
}: FieldGroupProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-sm font-medium text-foreground"
      >
        {icon && <span aria-hidden="true">{icon}</span>}
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && (
        <p
          id={htmlFor ? `${htmlFor}-hint` : undefined}
          className="text-xs leading-5 text-muted-foreground"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
