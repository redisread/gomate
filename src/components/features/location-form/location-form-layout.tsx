import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/starwind-react/card";
import { Label } from "@/components/starwind-react/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/starwind-react/collapsible";

interface SectionCardProps {
  icon: ReactNode;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}

const headingClass =
  "w-full flex items-center gap-2.5 px-5 py-4 text-left text-sm font-semibold text-card-foreground";
const bodyClass = "px-5 pb-5 pt-4 space-y-4 border-t border-border/50";
const triggerClass =
  "group min-h-11 hover:bg-muted/50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2";

function DisclosureIcon() {
  return (
    <ChevronDown
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-aria-expanded:rotate-180 motion-reduce:transition-none"
    />
  );
}

export function SectionCard({
  icon,
  title,
  badge,
  children,
  defaultOpen = true,
  collapsible = false,
}: SectionCardProps) {
  const heading = (
    <>
      <span
        aria-hidden="true"
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary"
      >
        {icon}
      </span>
      <span className="flex-1">{title}</span>
      {badge}
    </>
  );
  return (
    <Card className="gap-0 py-0 rounded-2xl overflow-hidden shadow-card">
      {collapsible ? (
        <Collapsible defaultOpen={defaultOpen}>
          <h2>
            <CollapsibleTrigger
              type="button"
              className={`${headingClass} ${triggerClass}`}
            >
              {heading}
              <DisclosureIcon />
            </CollapsibleTrigger>
          </h2>
          <CollapsibleContent className={bodyClass}>
            {children}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <>
          <h2 className={headingClass}>{heading}</h2>
          <div className={bodyClass}>{children}</div>
        </>
      )}
    </Card>
  );
}

export function SubSectionCard({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="border border-border rounded-xl overflow-hidden"
    >
      <h3>
        <CollapsibleTrigger
          type="button"
          className={`w-full flex items-center gap-2 px-4 py-3 text-left text-xs font-semibold text-card-foreground ${triggerClass}`}
        >
          <DisclosureIcon />
          <span>{title}</span>
        </CollapsibleTrigger>
      </h3>
      <CollapsibleContent className="px-4 pb-4 pt-2 border-t border-border/50">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  fieldId,
  controlId,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  fieldId?: string;
  controlId?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={fieldId ? `location-field-${fieldId}` : undefined}
      className="space-y-1.5"
    >
      {label &&
        (controlId ? (
          <Label
            htmlFor={controlId}
            className="block text-xs font-semibold text-card-foreground"
          >
            {label}
            {required && (
              <span aria-hidden="true" className="ml-1 text-destructive">
                *
              </span>
            )}
          </Label>
        ) : (
          <div className="text-xs font-semibold text-card-foreground">
            {label}
            {required && (
              <span aria-hidden="true" className="ml-1 text-destructive">
                *
              </span>
            )}
          </div>
        ))}
      {children}
      {(error || hint) && (
        <p
          id={controlId ? `${controlId}-description` : undefined}
          className={
            error ? "text-xs text-destructive" : "text-xs text-muted-foreground"
          }
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
