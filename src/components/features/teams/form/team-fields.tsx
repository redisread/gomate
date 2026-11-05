import { Input as SwInput } from "@/components/starwind-react/input";
import { Textarea as SwTextarea } from "@/components/starwind-react/textarea";
import { NativeSelect as SwNativeSelect } from "@/components/starwind-react/native-select";
import type { ChangeEventHandler, ReactNode } from "react";
import { DURATION_OPTION_DEFS } from "@/lib/duration-options";
import { FieldGroup } from "@/components/ui/field-group";
import { useI18n } from "@/hooks/useI18n";

export const TEAM_CONTROL_CLASS =
  "min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow,background-color] duration-150 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50 motion-reduce:transition-none";

type ChangeHandler = ChangeEventHandler<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>;
interface FieldProps {
  value: string;
  onChange: ChangeHandler;
  required?: boolean;
  testId?: string;
  disabled?: boolean;
}

export function TeamNameField({
  value,
  onChange,
  maxLength,
  testId,
}: FieldProps & { maxLength?: number }) {
  const { t } = useI18n(["teams"]);
  return (
    <FieldGroup htmlFor="title" label={t("teams.formLabel.name")} required>
      <SwInput
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
        className={TEAM_CONTROL_CLASS}
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
      htmlFor="startClockInput"
      label={t("teams.formLabel.startTime")}
      required={required}
    >
      <div className="relative">
        <SwInput
          id="startClockInput"
          name="startClockInput"
          type="time"
          value={value}
          onChange={onChange}
          required={required}
          data-testid={testId}
          className={TEAM_CONTROL_CLASS}
        />
      </div>
    </FieldGroup>
  );
}

export function TeamDescriptionField({
  value,
  onChange,
  required,
  testId,
}: FieldProps) {
  const { t } = useI18n(["teams"]);
  return (
    <FieldGroup
      htmlFor="description"
      label={t("teams.formLabel.description")}
      required={required}
    >
      <SwTextarea
        id="description"
        name="description"
        value={value}
        onChange={onChange}
        required={required}
        data-testid={testId}
        placeholder={t("teams.formPlaceholder.description")}
        rows={3}
        className={`${TEAM_CONTROL_CLASS} resize-y`}
      />
    </FieldGroup>
  );
}

export function TeamMeetingField({ value, onChange }: FieldProps) {
  const { t } = useI18n(["teams"]);
  return (
    <FieldGroup htmlFor="meetingPoint" label={t("teams.meetingPoint")}>
      <SwTextarea
        id="meetingPoint"
        name="meetingPoint"
        maxLength={1000}
        value={value}
        onChange={onChange}
        rows={2}
        className={`${TEAM_CONTROL_CLASS} resize-y`}
      />
    </FieldGroup>
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
      htmlFor="maxParticipants"
      label={t("teams.formLabel.maxSize")}
      required
      hint={hint}
    >
      <div className="relative">
        <SwInput
          aria-describedby="maxParticipants-hint"
          id="maxParticipants"
          data-testid={testId}
          name="maxParticipants"
          type="number"
          min={min}
          max={49}
          placeholder={t("teams.formPlaceholder.maxSize")}
          value={value}
          onChange={onChange}
          required
          className={TEAM_CONTROL_CLASS}
        />
      </div>
      {children}
    </FieldGroup>
  );
}

export function TeamActivityField({
  disabled,
  value,
  onChange,
  testId,
  children,
}: FieldProps & { children: ReactNode }) {
  const { t } = useI18n(["teams"]);
  return (
    <FieldGroup
      htmlFor="activityType"
      label={t("teams.formLabel.activityType")}
      required
    >
      <SwNativeSelect
        disabled={disabled}
        id="activityType"
        name="activityType"
        aria-label={t("teams.formLabel.activityType")}
        value={value}
        onChange={onChange}
        required
        data-testid={testId}
        className={`${TEAM_CONTROL_CLASS} pr-9`}
      >
        {children}
      </SwNativeSelect>
    </FieldGroup>
  );
}

export function TeamDurationField({
  value,
  onChange,
  required,
  testId,
}: FieldProps) {
  const { t } = useI18n(["teams"]);
  const hasCurrentOption = DURATION_OPTION_DEFS.some(
    ([minutes]) => String(minutes) === value,
  );
  return (
    <FieldGroup
      htmlFor="durationMinutes"
      label={t("teams.formLabel.duration")}
      required={required}
    >
      <SwNativeSelect
        id="durationMinutes"
        name="durationMinutes"
        value={value}
        onChange={onChange}
        required={required}
        data-testid={testId}
        className={`${TEAM_CONTROL_CLASS} pr-9`}
      >
        {!hasCurrentOption && (
          <option value={value}>
            {t("teams.formDurationMinutes", { minutes: value })}
          </option>
        )}
        {DURATION_OPTION_DEFS.map(([minutes, key]) => (
          <option key={minutes} value={minutes}>
            {t(key)}
          </option>
        ))}
      </SwNativeSelect>
    </FieldGroup>
  );
}
