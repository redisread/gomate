"use client";

import { Calendar, Loader2, LockKeyhole, Plus, X } from "lucide-react";
import { Input } from "@/components/starwind-react/input";
import { Button } from "@/components/starwind-react/button";
import { FieldGroup } from "@/components/ui/field-group";
import { RequestFailure } from "@/components/ui/request-failure";
import { ACTIVITY_TYPES } from "@/contracts";
import { TeamLocationPreview } from "./teams/shared/team-location-preview";
import { useEditTeamForm } from "./teams/form/use-edit-team-form";
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

export function EditTeamClient({ teamId }: { teamId: string }) {
  const ctx = useEditTeamForm(teamId);
  const { t, team, formData, handleChange } = ctx;
  if (ctx.sessionFailed) return <RequestFailure />;
  if (ctx.isLoading)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
      </main>
    );
  if (!ctx.isAuthenticated) return null;
  const backHref = `/teams/${teamId}`;
  if (!team)
    return (
      <TeamFormFrame
        title={t("teams.editTitle")}
        backHref={backHref}
        backLabel={t("teams.backToTeamDetail")}
      >
        <p role="alert" className="text-sm text-destructive">
          {ctx.error || t("errors.editNoPermission")}
        </p>
      </TeamFormFrame>
    );

  return (
    <TeamFormFrame
      title={t("teams.editTitle")}
      backHref={backHref}
      backLabel={t("teams.backToTeamDetail")}
    >
      <form
        onSubmit={ctx.handleSubmit}
        className="space-y-5"
        data-testid="team-form"
      >
        <TeamNameField
          value={formData.title}
          onChange={handleChange}
          maxLength={60}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup label={t("teams.formLabel.location")}>
            {team.location ? (
              <TeamLocationPreview
                location={team.location}
                detailHref={`/locations/${team.location.id}`}
              />
            ) : (
              <p className="break-all rounded-lg bg-muted p-3 text-sm">
                {team.locationId}
              </p>
            )}
          </FieldGroup>
          <TeamActivityField
            value={formData.activityType}
            onChange={handleChange}
          >
            {ACTIVITY_TYPES.map((activityType) => (
              <option key={activityType} value={activityType}>
                {t(`enums.locationType.${activityType}`)}
              </option>
            ))}
          </TeamActivityField>
        </div>
        <div className="space-y-2">
          <div className="grid gap-3 min-[380px]:grid-cols-2 sm:gap-4">
            <FieldGroup label={t("teams.formLabel.date")}>
              <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                <Calendar
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span>{formData.startDateInput}</span>
                <LockKeyhole
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            </FieldGroup>
            <TeamTimeField
              value={formData.startClockInput}
              onChange={handleChange}
            />
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {t("teams.formFixedDetails")}
          </p>
        </div>
        <div className="grid gap-3 min-[380px]:grid-cols-2 sm:gap-4">
          <TeamDurationField
            value={formData.durationMinutes}
            onChange={handleChange}
          />
          <TeamCapacityField
            value={formData.maxParticipants}
            onChange={handleChange}
            min={Math.max(1, team.activeParticipantCount)}
            hint={t("teams.editMaxSizeHint", {
              current: team.activeParticipantCount,
            })}
          />
        </div>
        <TeamDescriptionField
          value={formData.description}
          onChange={handleChange}
        />
        <TeamFormSupplementary
          defaultOpen={Boolean(team.meetingPoint || team.requirements?.length)}
        >
          <TeamMeetingField
            value={formData.meetingPoint}
            onChange={handleChange}
          />
          <FieldGroup
            label={t("teams.editRequirementsLabel")}
            hint={t("teams.editRequirementsHint")}
          >
            <ul className="space-y-2">
              {formData.requirements.map((requirement, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Input
                    value={requirement}
                    onChange={(event) =>
                      ctx.updateRequirement(index, event.target.value)
                    }
                    aria-label={t("teams.formRequirementNumber", {
                      number: index + 1,
                    })}
                    placeholder={t("teams.editRequirementPlaceholder")}
                    maxLength={100}
                    className={TEAM_CONTROL_CLASS}
                  />
                  <Button
                    variant="plain"
                    size="inherit"
                    type="button"
                    onClick={() => ctx.removeRequirement(index)}
                    aria-label={t("teams.formRemoveRequirement", {
                      number: index + 1,
                    })}
                    className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
            {formData.requirements.length < 10 && (
              <Button
                variant="outline"
                type="button"
                onClick={ctx.addRequirement}
                className="min-h-11 gap-2"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("teams.editAddRequirement")}
              </Button>
            )}
          </FieldGroup>
        </TeamFormSupplementary>
        <TeamFormActions
          label={t("teams.editSaveBtn")}
          loadingLabel={t("common.saving")}
          loading={ctx.isSubmitting}
          error={ctx.error}
          onCancel={() => {
            window.location.href = backHref;
          }}
        />
      </form>
    </TeamFormFrame>
  );
}
