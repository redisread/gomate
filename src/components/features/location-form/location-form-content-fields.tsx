"use client";

import * as React from "react";
import { ImageIcon } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { FormData } from "./use-location-form";
import { CoverImageUpload } from "@/components/ui/cover-image-upload";
import { MultiImageUpload } from "@/components/ui/multi-image-upload";
import { SeasonPicker } from "@/components/ui/season-picker";

interface SectionCardProps {
  icon: React.ReactNode; title: string; badge?: React.ReactNode;
  children: React.ReactNode; defaultOpen?: boolean; collapsible?: boolean;
}

function SectionCard({ icon, title, badge, children, defaultOpen = true, collapsible = false }: SectionCardProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <button type="button" onClick={() => collapsible && setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-5 py-4 text-left hover:bg-stone-50/60 dark:hover:bg-stone-800/60 transition-colors cursor-pointer">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(217,119,6,0.1)" }}>
          <span className="text-amber-600 dark:text-amber-400">{icon}</span>
        </span>
        <span className="text-sm font-semibold text-stone-800 dark:text-stone-200 flex-1">{title}</span>
        {badge && <span>{badge}</span>}
        <svg className="h-4 w-4 text-stone-400 dark:text-stone-500 transition-transform duration-200 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-stone-50 dark:border-stone-800">
          <div className="pt-4 space-y-4">{children}</div>
        </div>
      )}
    </div>
  );
}

interface FieldProps {
  label: string; required?: boolean; hint?: string; error?: string; fieldId?: string; children: React.ReactNode;
}

function Field({ label, required, hint, error, fieldId, children }: FieldProps) {
  return (
    <div id={fieldId ? `location-field-${fieldId}` : undefined} className="space-y-1.5">
      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
        {label}{required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {!error && hint && <p className="text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

interface LocationFormContentFieldsProps {
  formData: FormData;
  errors: Record<string, string | undefined>;
  isSaving: boolean;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}

export function LocationFormContentFields({ formData, errors, isSaving, updateField }: LocationFormContentFieldsProps) {
  const { t } = useI18n(["admin", "ui"]);
  return (
    <SectionCard icon={<ImageIcon className="h-4 w-4" />} title={t("admin.formContentTitle")}>
      <Field label={t("admin.formCoverImageRequired")} hint={t("ui.selectFromAlbum")} error={errors.coverImageUrl} fieldId="coverImageUrl">
        <CoverImageUpload value={formData.coverImageUrl} onChange={(url) => updateField("coverImageUrl", url)} disabled={isSaving} />
      </Field>
      <Field label={t("admin.formAlbumTitle")} hint={t("ui.coverHint")}>
        <MultiImageUpload values={formData.images} onChange={(urls) => updateField("images", urls)}
          max={9} disabled={isSaving} coverImage={formData.coverImageUrl} onSetCover={(url) => updateField("coverImageUrl", url)} />
      </Field>
      <Field label={t("admin.formBestSeason")} hint={t("admin.seasonSelectHint")}>
        <SeasonPicker value={formData.extra.hiking.bestSeasons}
          onChange={(bestSeasons) => updateField("extra", {
            ...formData.extra,
            hiking: { ...formData.extra.hiking, bestSeasons },
          })}
          disabled={isSaving} />
      </Field>
    </SectionCard>
  );
}
