"use client";

import * as React from "react";
import { Settings, ChevronDown } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { Tag } from "@/lib/types";
import type { FormData } from "./use-location-form";

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
        <svg className={cn("h-4 w-4 text-stone-400 dark:text-stone-500 transition-transform duration-200", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}

interface SubSectionCardProps {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}

function SubSectionCard({ title, children, defaultOpen = false }: SubSectionCardProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border border-stone-100 dark:border-stone-800 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-stone-50/60 dark:hover:bg-stone-800/60 transition-colors cursor-pointer">
        <ChevronDown className={cn("h-3.5 w-3.5 text-stone-400 transition-transform duration-200", open && "rotate-0", !open && "-rotate-90")} />
        <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">{title}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-stone-50 dark:border-stone-800">
          {children}
        </div>
      )}
    </div>
  );
}

function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
          {label}{required && <span className="ml-1 text-red-400">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {!error && hint && <p className="text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

const FACILITY_OPTIONS = (t: (key: string) => string) => [
  { value: "parking", label: `🅿️ ${t("admin.facilityParking")}` }, { value: "restroom", label: `🚻 ${t("admin.facilityRestroom")}` },
  { value: "water", label: `💧 ${t("admin.facilityWater")}` }, { value: "food", label: `🍱 ${t("admin.facilityFood")}` },
];

interface LocationFormSettingsFieldsProps {
  formData: FormData;
  allTags: Tag[];
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}

export function LocationFormSettingsFields({ formData, allTags, updateField }: LocationFormSettingsFieldsProps) {
  const { t } = useI18n(["admin"]);
  const facilityOptions = FACILITY_OPTIONS(t);
  return (<>
    <SectionCard icon={<Settings className="h-4 w-4" />} title={t("admin.formSettingsTitleRecommended")} collapsible defaultOpen={true}
      badge={<span className="text-3xs text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">{t("admin.optionalBadge")}</span>}>
      <div className="space-y-2">
      <SubSectionCard title={t("admin.formFacilitiesTitle")} defaultOpen={true}>
        <Field label="" hint="">{/* label 在 SubSectionCard title 中 */}
          <div className="flex flex-wrap gap-2">
            {facilityOptions.map((f) => {
              const selected = formData.extra.facilities.includes(f.value);
              return (
                <button key={f.value} type="button"
                  onClick={() => updateField("extra", { ...formData.extra, facilities: selected ? formData.extra.facilities.filter((v) => v !== f.value) : [...formData.extra.facilities, f.value] })}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border transition-[transform,background-color,border-color,color,opacity,box-shadow]",
                    selected ? "bg-amber-500 text-white border-amber-500" : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 hover:border-amber-300")}>
                  {f.label}
                </button>
              );
            })}
          </div>
        </Field>
      </SubSectionCard>

      <SubSectionCard title={t("admin.formTagsTitle")}>
        {/* 关联标签 */}
        <Field label="" hint={t("admin.formTagsHint")}>
          {allTags.length === 0 ? (
            <p className="text-xs text-stone-400">{t("admin.noTagsAvailable")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const selected = formData.tagIds.includes(tag.id);
                return (
                  <button key={tag.id} type="button"
                    onClick={() => updateField("tagIds", selected ? formData.tagIds.filter((id) => id !== tag.id) : [...formData.tagIds, tag.id])}
                    className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-[transform,background-color,border-color,color,opacity,box-shadow]",
                      selected ? "bg-amber-500 text-white border-amber-500" : "bg-white text-stone-600 border-stone-200 hover:border-amber-300")}>
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </Field>
      </SubSectionCard>
      </div>
    </SectionCard>

  </>);
}
