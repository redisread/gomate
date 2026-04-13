"use client";

import * as React from "react";
import { MapPin, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import type { City } from "@/lib/types";
import type { FormData } from "./use-location-form";
import { CitySelect } from "@/components/ui/city-select";

/* ================================================================
   共享子组件（SectionCard、Field、styledInput）
   ================================================================ */

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}

function SectionCard({ icon, title, badge, children, defaultOpen = true, collapsible = false }: SectionCardProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 overflow-hidden"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <button type="button" onClick={() => collapsible && setOpen((v) => !v)}
        className={cn("w-full flex items-center gap-2.5 px-5 py-4 text-left", collapsible && "hover:bg-stone-50/60 dark:hover:bg-stone-800/60 transition-colors cursor-pointer", !collapsible && "cursor-default")}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(217,119,6,0.1)" }}>
          <span className="text-amber-600 dark:text-amber-400">{icon}</span>
        </span>
        <span className="text-sm font-semibold text-stone-800 dark:text-stone-200 flex-1">{title}</span>
        {badge && <span>{badge}</span>}
        {collapsible && (
          <svg className={cn("h-4 w-4 text-stone-400 dark:text-stone-500 transition-transform duration-200", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
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
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}

function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
        {label}{required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
          </svg>{error}
        </p>
      )}
      {!error && hint && <p className="text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

function styledInput(hasError?: boolean) {
  return cn(
    "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-150",
    "border focus:ring-2",
    "bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500",
    hasError ? "border-red-300 dark:border-red-800 focus:ring-red-200 focus:border-red-400" : "border-stone-200 dark:border-stone-700 focus:ring-amber-200 focus:border-amber-400"
  );
}

/* ================================================================
   LocationFormBasicFields
   ================================================================ */

const LOCATION_TYPE_OPTIONS = (t: (key: any) => string) => [
  { value: "hiking", label: t("admin.locationTypeHiking") }, { value: "explore", label: t("admin.locationTypeExplore") },
  { value: "leisure", label: t("admin.locationTypeLeisure") }, { value: "travel", label: t("admin.locationTypeTravel") },
] as const;

interface LocationFormBasicFieldsProps {
  formData: FormData;
  errors: Record<string, string | undefined>;
  cities: City[];
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  touch: (key: string, value: string) => void;
  onOpenMapPicker: () => void;
}

export function LocationFormBasicFields({ formData, errors, cities, updateField, touch, onOpenMapPicker }: LocationFormBasicFieldsProps) {
  const { t } = useI18n();
  const locationTypeOptions = LOCATION_TYPE_OPTIONS(t);
  return (
    <div className="space-y-4">
      {/* 基本信息 */}
      <SectionCard icon={<FileText className="h-4 w-4" />} title={t("admin.formBasicTitle")}>
        <Field label={t("admin.formNameRequired")} required error={errors.name}>
          <input type="text" value={formData.name} onChange={(e) => updateField("name", e.target.value)}
            onBlur={(e) => touch("name", e.target.value)} className={cn(styledInput(!!errors.name))} />
        </Field>
        <Field label={t("admin.formSubtitle")} hint={t("admin.formSubtitleHint")}>
          <input type="text" value={formData.subtitle} onChange={(e) => updateField("subtitle", e.target.value)}
            className={cn(styledInput())} />
        </Field>
        <Field label={t("admin.formLocationType")}>
          <div className="flex flex-wrap gap-2">
            {locationTypeOptions.map((opt) => (
              <button key={opt.value} type="button"
                onClick={() => updateField("type", formData.type === opt.value ? "" : opt.value)}
                className={cn("px-3.5 py-1.5 rounded-full text-sm font-medium transition-all",
                  formData.type === opt.value ? "bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900" : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700")}>
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t("admin.formDescriptionRequired")} required error={errors.description}
          hint={t("admin.charCountHint", { count: formData.description.length })}>
          <div className="relative">
            <textarea rows={6} value={formData.description} onChange={(e) => updateField("description", e.target.value)}
              onBlur={(e) => touch("description", e.target.value)}
              className={cn(styledInput(!!errors.description), "resize-none leading-relaxed")} />
            <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5">
              <div className="h-1 w-16 rounded-full bg-stone-100 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-300",
                  formData.description.length < 50 ? "bg-stone-300" : formData.description.length < 100 ? "bg-amber-400" : "bg-emerald-400")}
                  style={{ width: `${Math.min((formData.description.length / 500) * 100, 100)}%` }} />
              </div>
              <span className={cn("text-[10px] tabular-nums", formData.description.length > 450 ? "text-amber-500" : "text-stone-300")}>
                {formData.description.length}
              </span>
            </div>
          </div>
        </Field>
      </SectionCard>

      {/* 位置信息 */}
      <SectionCard icon={<MapPin className="h-4 w-4" />} title={t("admin.formLocationTitle")}>
        <Field label={t("admin.formCity")} required error={errors.cityId}>
          <CitySelect value={formData.cityId} onChange={(id) => { updateField("cityId", id); touch("cityId", id); }}
            cities={cities} error={errors.cityId} />
        </Field>
        <Field label={t("admin.formAddress")}>
          <input type="text" value={formData.address} onChange={(e) => updateField("address", e.target.value)}
            className={cn(styledInput())} />
        </Field>
        <Field label={t("admin.formCoordinates")} hint={t("admin.coordinatesHelp")}>
          <div className="flex items-end gap-2">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">{t("admin.latLabel")}</label>
                <input type="number" step="any" value={formData.lat} onChange={(e) => updateField("lat", e.target.value)}
                  onBlur={(e) => touch("lat", e.target.value)} placeholder="22.5619" className={cn(styledInput(!!errors.lat))} />
                {errors.lat && <p className="text-xs text-red-500 mt-1">{errors.lat}</p>}
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 dark:text-stone-500 mb-1">{t("admin.lngLabel")}</label>
                <input type="number" step="any" value={formData.lng} onChange={(e) => updateField("lng", e.target.value)}
                  onBlur={(e) => touch("lng", e.target.value)} placeholder="114.1985" className={cn(styledInput(!!errors.lng))} />
                {errors.lng && <p className="text-xs text-red-500 mt-1">{errors.lng}</p>}
              </div>
            </div>
            <button type="button" onClick={onOpenMapPicker} title={t("admin.formMapPicker")}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors"
              style={{ borderColor: "#D97706", color: "#D97706", background: "rgba(217,119,6,0.05)" }}>
              <MapPin className="h-4 w-4" /><span className="hidden sm:inline">{t("admin.formMapPicker")}</span>
            </button>
          </div>
        </Field>
      </SectionCard>
    </div>
  );
}
