"use client";

import { Button as SwButton } from "@/components/starwind-react/button";
import { Input as SwInput } from "@/components/starwind-react/input";
import { Textarea as SwTextarea } from "@/components/starwind-react/textarea";

import { useCreateTeamForm } from "./teams/form/use-create-team-form";

import {
  TeamActivityField,
  TeamDurationField,
  TeamNameField,
  TeamTimeField,
  TeamCapacityField,
  TeamDescriptionFields,
} from "./teams/form/team-fields";
import { RequestFailure } from "@/components/ui/request-failure";

import {
  ArrowLeft,
  Calendar,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { DURATION_OPTION_DEFS } from "@/lib/duration-options";
import { Navbar } from "@/components/layout/navbar";
import { FieldGroup } from "@/components/ui/field-group";
import { SubmitButton } from "@/components/ui/submit-button";
import { QuickDurationButton } from "./create-team/quick-duration-button";
import { TeamLocationPicker } from "./create-team/team-location-picker";
import { TeamLocationPreview } from "./teams/shared/team-location-preview";
import { Footer } from "@/components/layout/footer";

/**
 * 创建队伍页 — 温暖引导风格
 * 分步感知 + 情感化文案 + 品牌色 focus 状态
 */
export function CreateTeamClient() {
  const {
    t,
    formData,
    defaultDate,
    locations,
    locationsLoading,
    locationsError,
    selectedLocation,
    setLocationSearch,
    setLocationSearchVersion,
    isAuthenticated,
    hasWechat,
    isSubmitting,
    sessionFailed,
    error,
    orderedActivityTypes,
    handleDurationQuickSelect,
    handleChange,
    handleLocationChange,
    handleSubmit,
  } = useCreateTeamForm();

  if (sessionFailed) return <RequestFailure />;
  if (isAuthenticated === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2
          className="h-8 w-8 animate-spin"
          style={{ color: "var(--primary)" }}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* 返回链接 */}
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-sm mb-8 text-muted-foreground hover:text-primary transition-colors duration-150"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("common.back")}
        </a>

        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5" style={{ color: "var(--primary)" }} />
            <h1 className="text-page-h1">{t("teams.createTitle")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("teams.createSubtitle")}
          </p>
        </div>

        {/* 微信号提醒 */}
        {!hasWechat && (
          <div className="mb-6 rounded-2xl p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold mb-1 text-amber-800 dark:text-amber-300">
                  {t("teams.wechatRequiredTitle")}
                </p>
                <p className="text-sm mb-3 text-amber-700 dark:text-amber-400">
                  {t("teams.wechatRequiredDesc")}
                </p>
                <a href="/profile/edit">
                  <SwButton variant="plain" size="inherit" type="button" className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 bg-card border border-amber-300/50 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 hover:bg-accent">
                    {t("teams.fillWechatBtn")}
                  </SwButton>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 表单卡片 */}
        <div
          className={`rounded-2xl p-6 sm:p-8 card-base ${!hasWechat ? "opacity-50 pointer-events-none" : ""}`}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 队伍标题 */}
            <TeamNameField
              value={formData.title}
              onChange={handleChange}
              testId="create-team-title"
            />

            {/* 目的地 */}
            <FieldGroup
              icon="📍"
              label={t("teams.formLabel.location")}
              required
            >
              <TeamLocationPicker
                value={formData.locationId}
                selectedLocation={selectedLocation}
                locations={locations}
                loading={locationsLoading}
                error={locationsError}
                onSearch={setLocationSearch}
                onRetry={() =>
                  setLocationSearchVersion((version) => version + 1)
                }
                onSelect={handleLocationChange}
              />
              {selectedLocation && (
                <TeamLocationPreview
                  location={selectedLocation}
                  detailHref={`/locations/${selectedLocation.id}`}
                  selectedLabel={t("teams.locationPreviewLabel")}
                  emptyCoverLabel={t("teams.locationCoverUnavailable")}
                  detailLabel={t("teams.viewDetailShort")}
                />
              )}
            </FieldGroup>

            {selectedLocation && (
              <TeamActivityField
                value={formData.activityType}
                onChange={handleChange}
                testId="create-team-activity-type"
              >
                <option value="">
                  {t("teams.formPlaceholder.activityType")}
                </option>
                {orderedActivityTypes.map((activityType) => (
                  <option key={activityType} value={activityType}>
                    {selectedLocation.supportedActivityTypes.includes(
                      activityType,
                    )
                      ? t("teams.recommendedActivityType", {
                          name: t(`enums.locationType.${activityType}`),
                        })
                      : t(`enums.locationType.${activityType}`)}
                  </option>
                ))}
              </TeamActivityField>
            )}

            {/* 日期 + 时间 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup icon="📅" label={t("teams.formLabel.date")} required>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
                  <SwInput
                    id="startDateInput"
                    data-testid="create-team-date"
                    name="startDateInput"
                    type="date"
                    value={formData.startDateInput}
                    onChange={handleChange}
                    min={defaultDate}
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border bg-muted text-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
                  />
                </div>
              </FieldGroup>

              <TeamTimeField
                value={formData.startClockInput}
                onChange={handleChange}
                required
                testId="create-team-time"
              />
            </div>

            {/* 日期不可修改提示 */}
            <p className="text-xs flex items-center gap-1.5 -mt-2 text-amber-600 dark:text-amber-500">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {t("teams.dateImmutableTip")}
            </p>

            {/* 时长 + 最大人数 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TeamDurationField
                value={formData.durationMinutes}
                onChange={handleChange}
                required
                hint={t("teams.durationDefaultHint")}
                testId="create-team-duration"
                footer={
                  <>
                    {" "}
                    {/* 快捷选项按钮组 */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <QuickDurationButton
                        label={t("teams.durationHalfDay")}
                        minutes={240}
                        currentValue={formData.durationMinutes}
                        onClick={() => handleDurationQuickSelect(240)}
                      />
                      <QuickDurationButton
                        label={t("teams.durationFullDay")}
                        minutes={480}
                        currentValue={formData.durationMinutes}
                        onClick={() => handleDurationQuickSelect(480)}
                      />
                      <QuickDurationButton
                        label={t("teams.durationTwoDays")}
                        minutes={1200}
                        currentValue={formData.durationMinutes}
                        onClick={() => handleDurationQuickSelect(1200)}
                      />
                      <SwButton variant="plain" size="inherit"
                        type="button"
                        onClick={() => {
                          const select = document.getElementById(
                            "durationMinutes",
                          ) as HTMLSelectElement | null;
                          if (select) {
                            select.focus();
                            select.click();
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        {t("teams.durationCustom")}
                      </SwButton>
                    </div>{" "}
                  </>
                }
              >
                {DURATION_OPTION_DEFS.map(([value, key]) => (
                  <option key={value} value={value}>
                    {t(key)}
                  </option>
                ))}
              </TeamDurationField>

              <TeamCapacityField
                value={formData.maxParticipants}
                onChange={handleChange}
                hint={t("teams.maxSizeHint")}
                testId="create-team-max-members"
              />
            </div>

            {/* 队伍描述 */}
            <TeamDescriptionFields
              meetingPoint={formData.meetingPoint}
              description={formData.description}
              onChange={handleChange}
              required
              hint={t("teams.descriptionHint")}
              testId="create-team-description"
            />

            <FieldGroup icon="📋" label={t("teams.formLabel.requirements")}>
              <SwTextarea
                id="requirementsInput"
                data-testid="create-team-requirements"
                name="requirementsInput"
                aria-label={t("teams.formLabel.requirements")}
                aria-describedby="create-team-requirements-hint"
                placeholder={t("teams.formPlaceholder.requirements")}
                value={formData.requirementsInput}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none resize-y focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
              />
              <p
                id="create-team-requirements-hint"
                className="text-xs text-muted-foreground"
              >
                {t("teams.requirementsInputHint")}
              </p>
            </FieldGroup>

            {/* 温馨提示 */}
            <div className="rounded-xl px-4 py-3.5 text-sm flex items-start gap-2.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40">
              <span className="text-base flex-shrink-0 mt-0.5">💡</span>
              <p className="text-amber-800 dark:text-amber-300">
                {t("teams.createTip")}
              </p>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-destructive/10 dark:bg-destructive/20 text-destructive dark:text-red-400 border border-destructive/20 dark:border-red-500/30">
                <span className="text-base">⚠️</span>
                {error}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-2">
              <SwButton variant="plain" size="inherit"
                type="button"
                onClick={() => window.history.back()}
                className="flex-1 py-3 rounded-xl border text-sm font-medium transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 border-border text-muted-foreground hover:bg-muted"
              >
                {t("common.cancel")}
              </SwButton>
              <SubmitButton
                data-testid="create-team-submit"
                loading={isSubmitting || !hasWechat}
                loadingText={
                  !hasWechat
                    ? t("teams.wechatRequiredBtn")
                    : t("teams.createBtnLoading")
                }
                className="flex-2"
              >
                {!hasWechat
                  ? t("teams.wechatRequiredBtn")
                  : isSubmitting
                    ? t("teams.createBtnLoading")
                    : t("teams.createBtn")}
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </main>
  );
}
