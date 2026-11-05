"use client";

import { Loader2 } from "lucide-react";
import { Input } from "@/components/starwind-react/input";
import { Textarea } from "@/components/starwind-react/textarea";
import { Button } from "@/components/starwind-react/button";
import { FieldGroup } from "@/components/ui/field-group";
import { RequestFailure } from "@/components/ui/request-failure";
import { TeamContactSetup } from "./create-team/team-contact-setup";
import { TeamLocationPicker } from "./create-team/team-location-picker";
import { useCreateTeamForm } from "./teams/form/use-create-team-form";
import {
  TeamActivityField,
  TeamCapacityField,
  TeamDescriptionField,
  TeamDurationField,
  TeamMeetingField,
  TeamNameField,
  TeamTimeField,
  TEAM_CONTROL_CLASS,
} from "./teams/form/team-fields";
import {
  TeamFormActions,
  TeamFormFrame,
  TeamFormSupplementary,
} from "./teams/form/team-form-layout";

export function CreateTeamClient() {
  const ctx = useCreateTeamForm();
  const { t, formData, selectedLocation, handleChange } = ctx;
  if (ctx.sessionFailed) return <RequestFailure />;
  if (ctx.isAuthenticated === null)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
      </main>
    );

  return (
    <TeamFormFrame
      title={t("teams.createTitle")}
      backHref="/teams"
      backLabel={t("common.backTeams")}
      beforeForm={
        !ctx.hasWechat && (
          <TeamContactSetup
            onSaved={() => {
              ctx.contactSaved();
              document.getElementById("title")?.focus();
            }}
          />
        )
      }
    >
      <form
        onSubmit={ctx.handleSubmit}
        className="space-y-5"
        data-testid="team-form"
      >
        <TeamNameField
          value={formData.title}
          onChange={handleChange}
          testId="create-team-title"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup label={t("teams.formLabel.location")} required>
            <TeamLocationPicker
              value={formData.locationId}
              selectedLocation={selectedLocation}
              locations={ctx.locations}
              loading={ctx.locationsLoading}
              error={ctx.locationsError}
              onSearch={ctx.setLocationSearch}
              onRetry={() =>
                ctx.setLocationSearchVersion((version) => version + 1)
              }
              onSelect={ctx.handleLocationChange}
            />
            {ctx.locationDetailLoading && (
              <p role="status" className="text-xs text-muted-foreground">
                {t("common.loading")}
              </p>
            )}
            {ctx.locationDetailError && (
              <div role="alert" className="space-y-1 text-sm text-destructive">
                <p>{t("teams.locationDetailLoadFailed")}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={ctx.retryLocationDetail}
                >
                  {t("common.retry")}
                </Button>
              </div>
            )}
          </FieldGroup>
          <TeamActivityField
            value={formData.activityType}
            disabled={!selectedLocation}
            onChange={handleChange}
            testId="create-team-activity-type"
          >
            <option value="">{t("teams.formPlaceholder.activityType")}</option>
            {ctx.orderedActivityTypes.map((activityType) => (
              <option key={activityType} value={activityType}>
                {selectedLocation?.supportedActivityTypes.includes(activityType)
                  ? t("teams.recommendedActivityType", {
                      name: t(`enums.locationType.${activityType}`),
                    })
                  : t(`enums.locationType.${activityType}`)}
              </option>
            ))}
          </TeamActivityField>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <FieldGroup
              htmlFor="startDateInput"
              label={t("teams.formLabel.date")}
              required
            >
              <Input
                id="startDateInput"
                name="startDateInput"
                type="date"
                value={formData.startDateInput}
                min={ctx.defaultDate}
                onChange={handleChange}
                required
                data-testid="create-team-date"
                className={TEAM_CONTROL_CLASS}
                aria-describedby="team-date-hint"
              />
            </FieldGroup>
            <TeamTimeField
              value={formData.startClockInput}
              onChange={handleChange}
              required
              testId="create-team-time"
            />
          </div>
          <p
            id="team-date-hint"
            className="text-xs leading-5 text-muted-foreground"
          >
            {t("teams.formDateHint")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <TeamDurationField
            value={formData.durationMinutes}
            onChange={handleChange}
            required
            testId="create-team-duration"
          />
          <TeamCapacityField
            value={formData.maxParticipants}
            onChange={handleChange}
            hint={t("teams.maxSizeHint")}
            testId="create-team-max-members"
          />
        </div>
        <TeamDescriptionField
          value={formData.description}
          onChange={handleChange}
          required
          testId="create-team-description"
        />
        <TeamFormSupplementary>
          <TeamMeetingField
            value={formData.meetingPoint}
            onChange={handleChange}
          />
          <FieldGroup
            htmlFor="requirementsInput"
            label={t("teams.formLabel.requirements")}
            hint={t("teams.requirementsInputHint")}
          >
            <Textarea
              id="requirementsInput"
              name="requirementsInput"
              data-testid="create-team-requirements"
              value={formData.requirementsInput}
              onChange={handleChange}
              rows={3}
              aria-describedby="requirementsInput-hint"
              placeholder={t("teams.formPlaceholder.requirements")}
              className={`${TEAM_CONTROL_CLASS} resize-y`}
            />
          </FieldGroup>
        </TeamFormSupplementary>
        <TeamFormActions
          label={
            ctx.hasWechat ? t("teams.createBtn") : t("teams.wechatRequiredBtn")
          }
          loadingLabel={t("teams.createBtnLoading")}
          loading={ctx.isSubmitting}
          disabled={!ctx.hasWechat}
          error={ctx.error}
          onCancel={() => window.history.back()}
          testId="create-team-submit"
        />
      </form>
    </TeamFormFrame>
  );
}
