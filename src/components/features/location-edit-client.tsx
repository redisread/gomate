"use client";

/**
 * 地点编辑页 · 重组版
 *
 * 主组件为薄组装层（<150 行），所有逻辑和子组件已提取至 ./location-form/ 目录。
 */

import * as React from "react";
import { ArrowLeft, Eye, EyeOff, MapPin as MapPinIcon, Image as ImageIcon, Navigation } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { EditProgressBar } from "@/components/ui/season-picker";
import { cn } from "@/lib/utils";

import type { FormData } from "./location-form";
import {
  useLocationForm,
  LocationFormBasicFields,
  LocationFormContentFields,
  LocationFormSettingsFields,
  LocationFormDecisionFields,
  LocationActionBar,
} from "./location-form";

/* ================================================================
   骨架屏
   ================================================================ */

function EditSkeleton() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-5 w-24 bg-stone-200 dark:bg-stone-800 rounded mb-6" />
        <div className="h-7 w-48 bg-stone-200 dark:bg-stone-800 rounded mb-8" />
        <div className="h-10 bg-stone-100 dark:bg-stone-900 rounded-2xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
          <div className="space-y-4">
            {[180, 220, 160].map((h, i) => (
              <div key={i} className="rounded-2xl bg-stone-200 dark:bg-stone-800 border border-stone-100 dark:border-stone-800" style={{ height: h }} />
            ))}
          </div>
          <div className="hidden lg:block">
            <div className="rounded-2xl bg-stone-200 dark:bg-stone-800 border border-stone-100 dark:border-stone-800 h-80" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   地图选点弹窗（独立组件，因其复杂度高）
   ================================================================ */



interface PreviewPanelProps { data: FormData; regionName: string; }

function PreviewPanel({ data, regionName }: PreviewPanelProps) {
  const { t } = useI18n(["admin", "common", "locations"]);
  const seasonEmojis: Record<string, string> = { spring: "🌸", summer: "☀️", autumn: "🍂", winter: "❄️" };
  return (
    <div className="sticky top-20">
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-50 dark:border-stone-800">
          <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">{t("admin.previewEffect")}</span>
        </div>
        <div className="w-full bg-stone-100 dark:bg-stone-800" style={{ aspectRatio: "16/9" }}>
          {data.coverImageUrl ? <img src={data.coverImageUrl} alt={t("admin.coverImagePreview")} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-8 w-8 text-stone-300 dark:text-stone-600" /></div>}
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base leading-snug">
              {data.name || <span className="text-stone-300 dark:text-stone-600">{t("admin.locationNamePlaceholder")}</span>}
            </h3>
            {data.subtitle && <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{data.subtitle}</p>}
          </div>
          {(regionName || data.address) && (
            <div className="flex items-start gap-1.5 text-xs text-stone-500 dark:text-stone-400">
              <MapPinIcon className="h-3.5 w-3.5 mt-0.5 text-amber-500 dark:text-amber-400 shrink-0" />
              <span>{[regionName, data.address].filter(Boolean).join(" · ")}</span>
            </div>
          )}
          {data.description && <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-3">{data.description}</p>}
          {data.extra.hiking.bestSeasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.extra.hiking.bestSeasons.map((s) => (
                <span key={s} className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium border border-amber-100 dark:border-amber-900/50">
                  {seasonEmojis[s]} {s}
                </span>
              ))}
            </div>
          )}
          {(data.latitude || data.longitude) && (
            <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
              <Navigation className="h-3 w-3" /><span>{data.latitude}, {data.longitude}</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-stone-400 dark:text-stone-500 text-center mt-2">{t("admin.previewAutoSync")}</p>
    </div>
  );
}

interface LocationFormClientProps { locationId?: string; }

function LocationFormClient({ locationId }: LocationFormClientProps) {
  const { t } = useI18n(["admin", "common", "locations"]);
  const form = useLocationForm(locationId);
  const [showPreview, setShowPreview] = React.useState(false);

  const currentRegionName = React.useMemo(
    () => form.regions.find((region) => region.id === form.formData.regionId)?.name ?? "",
    [form.regions, form.formData.regionId]
  );

  const progressSteps = [
    { id: "core", label: t("admin.progressStep1"), done: !!form.formData.name && !!form.formData.description },
    { id: "location", label: t("admin.progressStep2"), done: !!form.formData.regionId },
    { id: "media", label: t("admin.progressStep3"), done: !!form.formData.coverImageUrl },
    { id: "finish", label: t("admin.progressStep4"), done: !!form.formData.name && !!form.formData.description && !!form.formData.regionId && !!form.formData.coverImageUrl },
  ];

  if (form.isLoading) return <EditSkeleton />;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Top nav */}
        <div className="flex items-center justify-between mb-6">
          <a href={form.location ? `/locations/${form.location.id}` : "/locations"} className="inline-flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400 hover:opacity-70 transition-opacity">
            <ArrowLeft className="h-4 w-4" />{t("common.back")}
          </a>
          <button type="button" onClick={() => setShowPreview((v) => !v)}
            className="lg:hidden flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-600 transition-colors">
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? t("admin.closePreview") : t("admin.previewEffect")}
          </button>
        </div>

        {/* Title */}
        <div className="flex items-center gap-2 mb-6">
          <span className="w-1.5 h-6 rounded-full bg-amber-600" />
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">{t(form.mode === "edit" ? "admin.editLocation" : "admin.createLocation")}</h1>
        </div>

        {/* Progress */}
        <div className="mb-8 px-2"><EditProgressBar steps={progressSteps} /></div>

        {/* Draft banner */}
        {form.showDraftBanner && (
          <div className="mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
            <p className="text-sm text-amber-800 dark:text-amber-300">🗒 {t("admin.draftRestorePrompt")}</p>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={form.handleDiscardDraft} className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors">{t("admin.draftDiscardBtn")}</button>
              <button type="button" onClick={form.handleRestoreDraft} className="text-xs font-semibold px-3 py-1 rounded-lg text-white bg-amber-600 hover:bg-amber-700 transition-colors">{t("admin.draftRestoreBtn")}</button>
            </div>
          </div>
        )}

        {/* Save message */}
        {form.saveMessage && (
          <div className={cn("mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2",
            form.saveMessage.type === "success" ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50" : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50")}>
            {form.saveMessage.type === "success" ? (
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" /></svg>
            )}
            {form.saveMessage.text}
          </div>
        )}

        {/* Main content: two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
          <div className={cn("space-y-4", showPreview && "hidden lg:block")}>
            <LocationFormBasicFields formData={form.formData} errors={form.errors} regions={form.regions} activityTypes={form.activityTypes}
              updateField={form.updateField} touch={form.touch}  />
            <LocationFormContentFields formData={form.formData} isSaving={form.isSaving} updateField={form.updateField} />
            <LocationFormSettingsFields formData={form.formData} allTags={form.allTags} updateField={form.updateField} />
            {/* P0-B T4 (task #171)：决策信息 · 停车 + 装备（独立 SectionCard 放在设置之后） */}
            <LocationFormDecisionFields formData={form.formData} updateField={form.updateField} />
            <LocationActionBar isDirty={form.isDirty} isSaving={form.isSaving} onSave={form.handleSave} onDiscard={form.handleDiscard} />
          </div>

          {/* Right column: preview */}
          <div className={cn(showPreview ? "block" : "hidden", "lg:block")}>
            <PreviewPanel data={form.formData} regionName={currentRegionName} />
          </div>
        </div>
      </div>

      <StickyActionBar isDirty={form.isDirty} isSaving={form.isSaving} lastSaved={null}
        onSave={form.handleSave} onDiscard={form.handleDiscard} />

    </div>
  );
}

export function LocationEditClient({ locationId }: { locationId: string }) {
  return <LocationFormClient locationId={locationId} />;
}

export function LocationCreateClient() {
  return <LocationFormClient />;
}
