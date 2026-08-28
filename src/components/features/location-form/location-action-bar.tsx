"use client";

import * as React from "react";
import { Loader2, RotateCcw, Save, Send } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { locationStatusKey } from "@/lib/admin-i18n";
import type { LocationStatus } from "@/lib/types";
import type { LocationSaveIntent } from "./use-location-form";

interface LocationActionBarProps {
  status: LocationStatus;
  isDirty: boolean;
  isSaving: boolean;
  savingIntent: LocationSaveIntent | null;
  onSave: () => void;
  onPublish: () => void;
  onRestore: () => void;
  onDiscard: () => void;
}
const statusTone: Record<LocationStatus, string> = {
  draft: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  published: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
  archived: "bg-stone-100 text-stone-600 ring-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700",
};


export function LocationActionBar({
  status,
  isDirty,
  isSaving,
  savingIntent,
  onSave,
  onPublish,
  onRestore,
  onDiscard,
}: LocationActionBarProps) {
  const { t } = useI18n(["admin", "enums"]);

  const saveLabel = status === "draft" ? t("admin.saveDraft") : t("admin.saveChanges");

  return (
    <div
      role="region"
      aria-label={t("admin.locationActions")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-start">
          <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
            {t("admin.currentStatus")}
          </span>
          <span
            role="status"
            className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", statusTone[status])}
          >
            {t(locationStatusKey(status))}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={onDiscard}
              disabled={isSaving}
              className="min-h-11 rounded-xl px-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white"
            >
              {t("admin.discardChanges")}
            </button>
          )}

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || !isDirty}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            {savingIntent === "keep" ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
            {savingIntent === "keep" ? t("admin.saving") : saveLabel}
          </button>

          {status === "draft" && (
            <button
              type="button"
              onClick={onPublish}
              disabled={isSaving}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              {savingIntent === "publish" ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
              {savingIntent === "publish" ? t("admin.publishingLocation") : t("admin.publishLocation")}
            </button>
          )}

          {status === "archived" && (
            <button
              type="button"
              onClick={onRestore}
              disabled={isSaving}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              {savingIntent === "restore" ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <RotateCcw aria-hidden="true" className="h-4 w-4" />}
              {savingIntent === "restore" ? t("admin.restoringDraft") : t("admin.restoreToDraft")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
