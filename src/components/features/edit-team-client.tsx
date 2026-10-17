"use client";

import { useEditTeamForm } from "./teams/form/use-edit-team-form";

import {
  TeamActivityField,
  TeamDurationField,
  TeamNameField,
  TeamTimeField,
  TeamCapacityField,
  TeamDescriptionFields,
} from "./teams/form/team-fields";
import { RequestFailure } from "@/components/ui/request-failure";

import { ArrowLeft, AlertCircle, Loader2, Pencil } from "lucide-react";
import { ACTIVITY_TYPES } from "@/contracts";
import { Navbar } from "@/components/layout/navbar";
import { FieldGroup } from "@/components/ui/field-group";
import { SubmitButton } from "@/components/ui/submit-button";
import { Footer } from "@/components/layout/footer";
import { TeamLocationPreview } from "./teams/shared/team-location-preview";

interface EditTeamClientProps {
  teamId: string;
}

export function EditTeamClient({ teamId }: EditTeamClientProps) {
  const {
    t,
    team,
    isLoading,
    isAuthenticated,
    isSubmitting,
    sessionFailed,
    error,
    formData,
    handleChange,
    addRequirement,
    removeRequirement,
    updateRequirement,
    handleSubmit,
  } = useEditTeamForm(teamId);
  const location = team?.location;

  if (sessionFailed) return <RequestFailure />;
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2
          className="h-8 w-8 animate-spin"
          style={{ color: "var(--primary)" }}
        />
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!team) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-destructive/10 dark:bg-destructive/20 text-destructive dark:text-red-400 border border-destructive/20 dark:border-red-500/30">
            <span className="text-base">⚠️</span>
            {error || t("errors.editNoPermission")}
          </div>
          <a
            href={`/teams/${teamId}`}
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("teams.backToTeamDetail")}
          </a>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <a
          href={`/teams/${teamId}`}
          className="inline-flex items-center gap-1.5 text-sm mb-8 text-muted-foreground hover:text-primary transition-colors duration-150"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("teams.backToTeamDetail")}
        </a>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Pencil className="h-5 w-5" style={{ color: "var(--primary)" }} />
            <h1 className="text-2xl font-bold text-foreground">
              {t("teams.editTitle")}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("teams.editSubtitle")}
          </p>
        </div>

        <div className="rounded-2xl p-6 sm:p-8 card-base">
          <form onSubmit={handleSubmit} className="space-y-6">
            <TeamNameField
              value={formData.title}
              onChange={handleChange}
              maxLength={60}
            />

            <FieldGroup icon="📍" label={t("teams.formLabel.location")}>
              {location ? (
                <TeamLocationPreview
                  location={location}
                  detailHref={`/locations/${location.id}`}
                  selectedLabel={t("teams.locationPreviewLabel")}
                  emptyCoverLabel={t("teams.locationCoverUnavailable")}
                  detailLabel={t("teams.viewDetailShort")}
                />
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {team.locationId}
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                {t("teams.editLocationLocked")}
              </p>
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

            <FieldGroup icon="📅" label={t("teams.formLabel.date")}>
              <div className="px-4 py-3 rounded-xl bg-muted border border-border">
                <span className="text-sm text-foreground">
                  {formData.startDateInput}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                {t("teams.editDateLocked")}
              </p>
            </FieldGroup>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TeamTimeField
                value={formData.startClockInput}
                onChange={handleChange}
              />

              <TeamDurationField
                value={formData.durationMinutes}
                onChange={handleChange}
              >
                {[120, 180, 240, 300, 360, 420, 480, 540, 600, 720].map((m) => (
                  <option key={m} value={m}>
                    {t("teams.editDurationHours", { hours: m / 60 })}
                  </option>
                ))}
              </TeamDurationField>
            </div>

            <TeamCapacityField
              value={formData.maxParticipants}
              onChange={handleChange}
              min={Math.max(1, team.activeParticipantCount)}
              hint={t("teams.editMaxSizeHint", {
                current: team.activeParticipantCount,
              })}
            >
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                {t("teams.editMaxMembersTip", {
                  current: team.activeParticipantCount,
                })}
              </p>
            </TeamCapacityField>

            <TeamDescriptionFields
              meetingPoint={formData.meetingPoint}
              description={formData.description}
              onChange={handleChange}
            />

            <FieldGroup
              icon="📋"
              label={t("teams.editRequirementsLabel")}
              hint={t("teams.editRequirementsHint")}
            >
              <ul className="space-y-2">
                {formData.requirements.map((req, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={req}
                      onChange={(e) => updateRequirement(i, e.target.value)}
                      placeholder={t("teams.editRequirementPlaceholder")}
                      maxLength={100}
                      className="flex-1 px-3 py-2 rounded-lg border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10"
                    />
                    <button
                      type="button"
                      onClick={() => removeRequirement(i)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 text-stone-400 dark:text-stone-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              {formData.requirements.length < 10 && (
                <button
                  type="button"
                  onClick={addRequirement}
                  className="w-full mt-2 py-2.5 rounded-lg border text-sm font-medium transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 flex items-center justify-center gap-1.5 border-border text-muted-foreground hover:bg-muted hover:border-primary hover:text-primary"
                >
                  <span>{t("teams.editAddRequirement")}</span>
                </button>
              )}
              {formData.requirements.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3" />
                  {t("teams.editRequirementsEmptyTip")}
                </p>
              )}
            </FieldGroup>

            <div className="rounded-xl px-4 py-3.5 text-sm flex items-start gap-2.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40">
              <span className="text-base flex-shrink-0 mt-0.5">💡</span>
              <p className="text-amber-800 dark:text-amber-300">
                {t("teams.editSaveTip")}
              </p>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-destructive/10 dark:bg-destructive/20 text-destructive dark:text-red-400 border border-destructive/20 dark:border-red-500/30">
                <span className="text-base">⚠️</span>
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => (window.location.href = `/teams/${teamId}`)}
                className="flex-1 py-3 rounded-xl border text-sm font-medium transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 border-border text-muted-foreground hover:bg-muted"
              >
                {t("common.cancel")}
              </button>
              <SubmitButton
                loading={isSubmitting}
                loadingText={t("common.saving")}
                className="flex-2"
              >
                {isSubmitting ? t("common.saving") : t("teams.editSaveBtn")}
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </main>
  );
}
