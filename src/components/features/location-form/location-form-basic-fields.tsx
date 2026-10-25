"use client";

import { SectionCard, Field } from "./location-form-layout";

import { Button as SwButton } from "@/components/starwind-react/button";
import { Label as SwLabel } from "@/components/starwind-react/label";
import { Input as SwInput } from "@/components/starwind-react/input";
import { Textarea as SwTextarea } from "@/components/starwind-react/textarea";

import { MapPin, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import type { ActivityType, Region } from "@/lib/types";
import type { FormData } from "./location-form-data";
import { RegionSelect } from "@/components/ui/region-select";

function styledInput(hasError?: boolean) {
  return cn(
    "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150",
    "border focus:ring-2",
    "bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500",
    hasError ? "border-red-300 dark:border-red-800 focus:ring-red-200 focus:border-red-400" : "border-stone-200 dark:border-stone-700 focus:ring-amber-200 focus:border-amber-400"
  );
}



interface LocationFormBasicFieldsProps {
  formData: FormData;
  errors: Record<string, string | undefined>;
  regions: Region[];
  activityTypes: readonly ActivityType[];
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  touch: (key: string, value: string) => void;
  }

export function LocationFormBasicFields({ formData, errors, regions, activityTypes, updateField, touch }: LocationFormBasicFieldsProps) {
  const { t } = useI18n(["admin", "enums"]);
  return (
    <div className="space-y-4">
      {/* 基本信息 */}
      <SectionCard icon={<FileText className="h-4 w-4" />} title={t("admin.formBasicTitle")}>
        <Field controlId="location-input-name" label={t("admin.formNameRequired")} error={errors.name} fieldId="name">
          <SwInput id="location-input-name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "location-input-name-description" : undefined} type="text" value={formData.name} onChange={(e) => updateField("name", e.target.value)}
            onBlur={(e) => touch("name", e.target.value)} className={cn(styledInput(!!errors.name))} />
        </Field>
        <Field error={errors.subtitle} controlId="location-input-subtitle" label={t("admin.formSubtitle")} hint={t("admin.formSubtitleHint")}>
          <SwInput id="location-input-subtitle" aria-invalid={!!errors.subtitle} aria-describedby="location-input-subtitle-description" type="text" value={formData.subtitle} onChange={(e) => updateField("subtitle", e.target.value)}
            className={cn(styledInput())} />
        </Field>
        <Field error={errors.slug} controlId="location-input-slug" label={t("admin.formSlug")} hint={t("admin.formSlugHint")}>
          <SwInput id="location-input-slug" aria-invalid={!!errors.slug} aria-describedby="location-input-slug-description" type="text" value={formData.slug}
            onChange={(e) => updateField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder={t("admin.placeholderSlug")} className={cn(styledInput())} />
        </Field>
        <Field label={t("admin.formLocationType")}>
          <div className="flex flex-wrap gap-2">
            {activityTypes.map((activityType) => {
              const selected = formData.supportedActivityTypes.includes(activityType);
              return <SwButton variant="plain" size="inherit" key={activityType} type="button" aria-pressed={selected}
                onClick={() => updateField(
                  "supportedActivityTypes",
                  selected
                    ? formData.supportedActivityTypes.filter((value) => value !== activityType)
                    : [...formData.supportedActivityTypes, activityType],
                )}
                className={cn("px-3.5 py-1.5 rounded-full text-sm font-medium transition-[transform,background-color,border-color,color,opacity,box-shadow]",
                  selected ? "bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900" : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700")}>
                {t(`enums.locationType.${activityType}`)}
              </SwButton>;
            })}
          </div>
          {errors.supportedActivityTypes && <p className="mt-1 text-xs text-red-500">{errors.supportedActivityTypes}</p>}
        </Field>
        <Field controlId="location-input-description" label={t("admin.formDescriptionRequired")} error={errors.description} fieldId="description"
          hint={t("admin.charCountHint", { count: formData.description.length })}>
          <div className="relative">
            <SwTextarea id="location-input-description" aria-invalid={!!errors.description} aria-describedby="location-input-description-description" rows={6} value={formData.description} onChange={(e) => updateField("description", e.target.value)}
              onBlur={(e) => touch("description", e.target.value)}
              className={cn(styledInput(!!errors.description), "resize-none leading-relaxed")} />
            <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5">
              <div className="h-1 w-16 rounded-full bg-stone-100 overflow-hidden">
                <div className={cn("h-full rounded-full transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-300",
                  formData.description.length < 50 ? "bg-stone-300" : formData.description.length < 100 ? "bg-amber-400" : "bg-emerald-400")}
                  style={{ width: `${Math.min((formData.description.length / 500) * 100, 100)}%` }} />
              </div>
              <span className={cn("text-3xs tabular-nums", formData.description.length > 450 ? "text-amber-500" : "text-stone-300")}>
                {formData.description.length}
              </span>
            </div>
          </div>
        </Field>
      </SectionCard>

      {/* 位置信息 */}
      <SectionCard icon={<MapPin className="h-4 w-4" />} title={t("admin.formLocationTitle")}>
        <Field label={t("admin.formRegion")} required error={errors.regionId} fieldId="regionId">
          <RegionSelect value={formData.regionId} onChange={(id) => { updateField("regionId", id); touch("regionId", id); }}
            regions={regions} error={errors.regionId} />
        </Field>
        <Field error={errors.address} controlId="location-input-address" label={t("admin.formAddress")}>
          <SwInput id="location-input-address" aria-invalid={!!errors.address} aria-describedby={errors.address ? "location-input-address-description" : undefined} type="text" value={formData.address} onChange={(e) => updateField("address", e.target.value)}
            className={cn(styledInput())} />
        </Field>
        <Field label={t("admin.formCoordinates")} hint={t("admin.coordinatesHelp")}>
          <div className="flex items-end gap-2">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <SwLabel htmlFor="location-field-latitude" className="block text-2xs text-stone-400 mb-1">{t("admin.latLabel")}</SwLabel>
                <SwInput id="location-field-latitude" aria-invalid={!!errors.latitude} aria-describedby={errors.latitude ? "location-latitude-error" : undefined} type="number" step="any" value={formData.latitude} onChange={(e) => updateField("latitude", e.target.value)}
                  onBlur={(e) => touch("latitude", e.target.value)} placeholder="22.5619" className={cn(styledInput(!!errors.latitude))} />
                {errors.latitude && <p id="location-latitude-error" className="text-xs text-red-500 mt-1">{errors.latitude}</p>}
              </div>
              <div>
                <SwLabel htmlFor="location-field-longitude" className="block text-2xs text-stone-400 dark:text-stone-500 mb-1">{t("admin.lngLabel")}</SwLabel>
                <SwInput id="location-field-longitude" aria-invalid={!!errors.longitude} aria-describedby={errors.longitude ? "location-longitude-error" : undefined} type="number" step="any" value={formData.longitude} onChange={(e) => updateField("longitude", e.target.value)}
                  onBlur={(e) => touch("longitude", e.target.value)} placeholder="114.1985" className={cn(styledInput(!!errors.longitude))} />
                {errors.longitude && <p id="location-longitude-error" className="text-xs text-red-500 mt-1">{errors.longitude}</p>}
              </div>
            </div>

          </div>
        </Field>
      </SectionCard>
    </div>
  );
}
