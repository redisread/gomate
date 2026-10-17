import type { ChangeEventHandler, ReactNode } from "react";
import { Clock, Users } from "lucide-react";
import { FieldGroup } from "@/components/ui/field-group";
import { useI18n } from "@/hooks/useI18n";

type ChangeHandler = ChangeEventHandler<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>;
interface FieldProps {
  value: string;
  onChange: ChangeHandler;
  required?: boolean;
  testId?: string;
}

export function TeamNameField({
  value,
  onChange,
  maxLength,
  testId,
}: FieldProps & { maxLength?: number }) {
  const { t } = useI18n(["teams"]);
  return (
    <FieldGroup icon="✏️" label={t("teams.formLabel.name")} required>
      <input
        id="title"
        aria-label={t("teams.formLabel.name")}
        name="title"
        type="text"
        placeholder={t("teams.formPlaceholder.name")}
        value={value}
        onChange={onChange}
        required
        maxLength={maxLength}
        data-testid={testId}
        className="w-full px-4 py-3 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
      />
    </FieldGroup>
  );
}

export function TeamTimeField({
  value,
  onChange,
  required,
  testId,
}: FieldProps) {
  const { t } = useI18n(["teams"]);
  return (
    <FieldGroup
      icon="⏰"
      label={t("teams.formLabel.startTime")}
      required={required}
    >
      <div className="relative">
        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
        <input
          id="startClockInput"
          aria-label={t("teams.formLabel.startTime")}
          name="startClockInput"
          type="time"
          value={value}
          onChange={onChange}
          required={required}
          data-testid={testId}
          className="w-full pl-11 pr-4 py-3 rounded-xl border bg-muted text-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
        />
      </div>
    </FieldGroup>
  );
}

export function TeamDescriptionFields({
  meetingPoint,
  description,
  onChange,
  required,
  hint,
  testId,
}: {
  meetingPoint: string;
  description: string;
  onChange: ChangeHandler;
  required?: boolean;
  hint?: string;
  testId?: string;
}) {
  const { t } = useI18n(["teams"]);
  return (
    <>
      <FieldGroup icon="📍" label={t("teams.meetingPoint")}>
        <textarea
          name="meetingPoint"
          aria-label={t("teams.meetingPoint")}
          maxLength={1000}
          value={meetingPoint}
          onChange={onChange}
          className="w-full rounded-xl border border-border bg-background p-3"
        />
      </FieldGroup>
      <FieldGroup
        icon="📝"
        label={t("teams.formLabel.description")}
        required={required}
        hint={hint}
      >
        <textarea
          id="description"
          aria-label={t("teams.formLabel.description")}
          required={required}
          data-testid={testId}
          name="description"
          placeholder={t("teams.formPlaceholder.description")}
          value={description}
          onChange={onChange}
          rows={4}
          className="w-full px-4 py-3 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none resize-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
        />
      </FieldGroup>
    </>
  );
}

export function TeamCapacityField({
  value,
  onChange,
  min = 1,
  hint,
  testId,
  children,
}: FieldProps & { min?: number; hint: string; children?: ReactNode }) {
  const { t } = useI18n(["teams"]);
  return (
    <FieldGroup
      icon="👥"
      label={t("teams.formLabel.maxSize")}
      required
      hint={hint}
    >
      <div className="relative">
        <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
        <input
          id="maxParticipants"
          aria-label={t("teams.formLabel.maxSize")}
          data-testid={testId}
          name="maxParticipants"
          type="number"
          min={min}
          max={49}
          placeholder={t("teams.formPlaceholder.maxSize")}
          value={value}
          onChange={onChange}
          required
          className="w-full pl-11 pr-4 py-3 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
        />
      </div>
      {children}
    </FieldGroup>
  );
}

export function TeamActivityField({
  value,
  onChange,
  testId,
  children,
}: FieldProps & { children: ReactNode }) {
  const { t } = useI18n(["teams"]);
  return (
    <FieldGroup icon="🧭" label={t("teams.formLabel.activityType")} required>
      <select
        id="activityType"
        name="activityType"
        aria-label={t("teams.formLabel.activityType")}
        value={value}
        onChange={onChange}
        required
        data-testid={testId}
        className="w-full px-4 py-3 rounded-xl border bg-muted text-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none appearance-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
      >
        {children}
      </select>
    </FieldGroup>
  );
}

export function TeamDurationField({
  value,
  onChange,
  required,
  testId,
  hint,
  children,
  footer,
}: FieldProps & { hint?: string; children: ReactNode; footer?: ReactNode }) {
  const { t } = useI18n(["teams"]);
  return (
    <FieldGroup
      icon="⌛"
      label={t("teams.formLabel.duration")}
      required={required}
      hint={hint}
    >
      <div className="relative">
        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
        <select
          id="durationMinutes"
          name="durationMinutes"
          aria-label={t("teams.formLabel.duration")}
          value={value}
          onChange={onChange}
          required={required}
          data-testid={testId}
          className="w-full pl-11 pr-4 py-3 rounded-xl border bg-muted text-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none appearance-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
        >
          {children}
        </select>
      </div>
      {footer}
    </FieldGroup>
  );
}
