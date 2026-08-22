"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Loader2, AlertCircle } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { TeamChecklist } from "@/contracts";
import { FieldGroup } from "@/components/ui/field-group";
import { ChipInput } from "@/components/ui/chip-input";
import {
  useTeamChecklistForm,
  CHECKLIST_MAX_BYTES,
} from "./use-team-checklist-form";

// Leader-only actionbook editor.
//
// - independent Save button (not merged with team basic-info form)
// - fold section by default so it doesn't crowd the edit page above
// - chip-input for gear + task rows for assignments (stable client id)
// - draft banner when a localStorage draft exists

interface Props {
  teamId: string;
  initialChecklist: TeamChecklist | null | undefined;
  /** whether the current session user is the leader (parent decides) */
  isLeader: boolean;
}

const TRANSPORT_MODES = ["self_drive", "public", "charter", "other"] as const;

export function TeamActionbookForm({ teamId, initialChecklist, isLeader }: Props) {
  const { t } = useI18n(["teams", "errors", "common"]);
  const [expanded, setExpanded] = React.useState<boolean>(() => Boolean(initialChecklist));

  const {
    form,
    setField,
    addAssignment,
    updateAssignment,
    removeAssignment,
    isSaving,
    saveResult,
    clearSaveResult,
    draftAvailable,
    handleRestoreDraft,
    handleDiscardDraft,
    handleSave,
    currentBytes,
    overflowing,
  } = useTeamChecklistForm({ teamId, initialChecklist, t });

  if (!isLeader) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSave();
  };

  return (
    <section
      className="rounded-2xl p-6 sm:p-8 card-base"
      aria-labelledby="actionbook-heading"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={expanded}
        aria-controls="actionbook-body"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>📋</span>
          <h2
            id="actionbook-heading"
            className="text-lg font-semibold text-foreground"
          >
            {t("teams.actionbook.title")}
          </h2>
          {initialChecklist ? null : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
              {t("teams.actionbook.newBadge")}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {!expanded && (
        <p className="mt-2 text-sm text-muted-foreground">
          {initialChecklist
            ? t("teams.actionbook.foldedHintFilled")
            : t("teams.actionbook.foldedHintEmpty")}
        </p>
      )}

      {expanded && (
        <div id="actionbook-body" className="mt-6">
          {draftAvailable && (
            <div className="mb-4 rounded-xl px-4 py-3 text-sm flex items-start gap-2.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40">
              <span className="text-base flex-shrink-0 mt-0.5">💾</span>
              <div className="flex-1">
                <p className="text-amber-800 dark:text-amber-300 mb-2">
                  {t("teams.actionbook.draftAvailable")}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRestoreDraft}
                    className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium"
                  >
                    {t("teams.actionbook.draftRestore")}
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="px-3 py-1 rounded-md border border-amber-300 text-amber-700 dark:text-amber-400 text-xs"
                  >
                    {t("teams.actionbook.draftDiscard")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            {/* 集合点 */}
            <FieldGroup icon="📍" label={t("teams.actionbook.meetingTitle")}>
              <input
                type="text"
                value={form.meetingPointName}
                onChange={(e) => setField("meetingPointName", e.target.value)}
                placeholder={t("teams.actionbook.meetingNamePlaceholder")}
                maxLength={200}
                className="w-full px-4 py-3 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
              />
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={form.meetingPointTime}
                  onChange={(e) => setField("meetingPointTime", e.target.value)}
                  placeholder={t("teams.actionbook.meetingTimePlaceholder")}
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
                />
                <input
                  type="text"
                  value={form.meetingPointNote}
                  onChange={(e) => setField("meetingPointNote", e.target.value)}
                  placeholder={t("teams.actionbook.meetingNotePlaceholder")}
                  maxLength={500}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
                />
              </div>
            </FieldGroup>

            {/* 交通 */}
            <FieldGroup icon="🚙" label={t("teams.actionbook.transportTitle")}>
              <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-2">
                <select
                  value={form.transportMode}
                  onChange={(e) =>
                    setField("transportMode", e.target.value as typeof form.transportMode)
                  }
                  className="w-full px-4 py-3 rounded-xl border bg-muted text-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none appearance-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
                >
                  <option value="">{t("teams.actionbook.transportModePlaceholder")}</option>
                  {TRANSPORT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {t(`teams.actionbook.transportMode.${m}`)}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.transportDetail}
                  onChange={(e) => setField("transportDetail", e.target.value)}
                  placeholder={t("teams.actionbook.transportDetailPlaceholder")}
                  maxLength={500}
                  className="w-full px-4 py-3 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
                />
              </div>
            </FieldGroup>

            {/* 装备 */}
            <FieldGroup icon="🎒" label={t("teams.actionbook.gearTitle")}>
              <label className="block text-xs text-muted-foreground mb-1.5">
                {t("teams.actionbook.gearEssentialLabel")}
              </label>
              <ChipInput
                values={form.gearEssential}
                onChange={(next) => setField("gearEssential", next)}
                placeholder={t("teams.actionbook.gearChipPlaceholder")}
                ariaLabel={t("teams.actionbook.gearEssentialLabel")}
                maxItems={50}
                maxItemLength={50}
                data-testid="gear-essential-input"
              />
              <label className="block text-xs text-muted-foreground mt-3 mb-1.5">
                {t("teams.actionbook.gearOptionalLabel")}
              </label>
              <ChipInput
                values={form.gearOptional}
                onChange={(next) => setField("gearOptional", next)}
                placeholder={t("teams.actionbook.gearChipPlaceholder")}
                ariaLabel={t("teams.actionbook.gearOptionalLabel")}
                maxItems={50}
                maxItemLength={50}
                data-testid="gear-optional-input"
              />
              <input
                type="text"
                value={form.gearNote}
                onChange={(e) => setField("gearNote", e.target.value)}
                placeholder={t("teams.actionbook.gearNotePlaceholder")}
                maxLength={500}
                className="w-full mt-3 px-4 py-2.5 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
              />
            </FieldGroup>

            {/* 分工 */}
            <FieldGroup
              icon="🤝"
              label={t("teams.actionbook.assignmentsTitle")}
              hint={t("teams.actionbook.assignmentsHint")}
            >
              <ul className="space-y-2">
                {form.assignments.map((a, i) => (
                  <li key={a.id} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={a.task}
                      onChange={(e) => updateAssignment(a.id, e.target.value)}
                      placeholder={t("teams.actionbook.assignmentPlaceholder")}
                      maxLength={200}
                      className="flex-1 px-3 py-2 rounded-lg border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10"
                    />
                    <button
                      type="button"
                      onClick={() => removeAssignment(a.id)}
                      aria-label={t("teams.actionbook.assignmentRemove")}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 text-stone-400 dark:text-stone-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              {form.assignments.length < 50 && (
                <button
                  type="button"
                  onClick={addAssignment}
                  className="w-full mt-2 py-2.5 rounded-lg border text-sm font-medium transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 flex items-center justify-center gap-1.5 border-border text-muted-foreground hover:bg-muted hover:border-primary hover:text-primary"
                >
                  {t("teams.actionbook.assignmentAdd")}
                </button>
              )}
            </FieldGroup>

            {/* 其他约定 */}
            <FieldGroup icon="📝" label={t("teams.actionbook.notesTitle")}>
              <textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder={t("teams.actionbook.notesPlaceholder")}
                rows={4}
                maxLength={2000}
                className="w-full px-4 py-3 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none resize-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
              />
            </FieldGroup>

            {/* 大小指示 + 错误/成功横幅 */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span
                className={
                  overflowing
                    ? "text-red-600 dark:text-red-400 font-medium"
                    : "text-muted-foreground"
                }
              >
                {t("teams.actionbook.sizeIndicator", {
                  bytes: currentBytes,
                  max: CHECKLIST_MAX_BYTES,
                })}
              </span>
            </div>

            {saveResult && (
              <div
                role={saveResult.type === "error" ? "alert" : "status"}
                className={
                  saveResult.type === "error"
                    ? "rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-destructive/10 dark:bg-destructive/20 text-destructive dark:text-red-400 border border-destructive/20 dark:border-red-500/30"
                    : "rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40"
                }
              >
                <span className="text-base">
                  {saveResult.type === "error" ? "⚠️" : "✓"}
                </span>
                <span className="flex-1">{saveResult.message}</span>
                <button
                  type="button"
                  onClick={clearSaveResult}
                  aria-label={t("common.close")}
                  className="text-current opacity-70 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving || overflowing}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving
                  ? t("common.saving")
                  : t("teams.actionbook.saveBtn")}
              </button>
            </div>
            {overflowing && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 justify-end">
                <AlertCircle className="h-3 w-3" />
                {t("teams.actionbook.overflowHint")}
              </p>
            )}
          </form>
        </div>
      )}
    </section>
  );
}
