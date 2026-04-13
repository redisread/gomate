"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, X, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import type { PoiDetail } from "@/lib/types";
import type { FormData } from "./use-location-form";
import { PoiEditModal, PoiDeleteConfirm } from "@/components/ui/poi-edit-modal";

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

function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
        {label}{required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
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

const POI_ROLE_OPTIONS = (t: (key: any) => string) => [
  { value: "waypoint", label: t("admin.poiRoleWaypoint") }, { value: "checkpoint", label: t("admin.poiRoleCheckpoint") },
  { value: "viewpoint", label: t("admin.poiRoleViewpoint") }, { value: "facility", label: t("admin.poiRoleFacility") },
  { value: "poi", label: t("admin.poiRolePoi") },
];

interface LocationFormRouteFieldsProps {
  formData: FormData;
  allPois: Array<{ id: string; name: string; description?: string | null }>;
  poiModalOpen: boolean;
  poiModalMode: "create" | "edit";
  editingPoi: PoiDetail | null;
  deleteConfirmOpen: boolean;
  deletingPoi: { id: string; name: string } | null;
  deletingPoiAssociations: number;
  isDeletingPoi: boolean;
  poiSearch: string;
  poiSearchResults: Array<{ id: string; name: string; description?: string | null }>;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  handlePoiSearch: (value: string) => void;
  handleOpenCreatePoi: () => void;
  handleOpenEditPoi: (poiId: string) => Promise<void>;
  handlePoiModalSuccess: (poi: { id: string; name: string; coordinates: { lat: number; lng: number } }) => void;
  handleOpenDeletePoi: (poiId: string, poiName: string) => Promise<void>;
  handleConfirmDeletePoi: () => Promise<void>;
}

export function LocationFormRouteFields({
  formData, allPois, poiModalOpen, poiModalMode, editingPoi,
  deleteConfirmOpen, deletingPoi, deletingPoiAssociations, isDeletingPoi,
  poiSearch, poiSearchResults, updateField, handlePoiSearch,
  handleOpenCreatePoi, handleOpenEditPoi, handlePoiModalSuccess,
  handleOpenDeletePoi, handleConfirmDeletePoi,
}: LocationFormRouteFieldsProps) {
  const { t } = useI18n(["admin", "pois"]);
  const poiRoleOptions = POI_ROLE_OPTIONS(t);
  return (
    <SectionCard
      icon={<MapPin className="h-4 w-4" />}
      title={t("admin.formRouteTitle")}
      badge={<span className="text-[10px] text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">{t("admin.optionalBadge")}</span>}
      collapsible defaultOpen={false}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
          <input type="text" value={poiSearch} onChange={(e) => handlePoiSearch(e.target.value)}
            placeholder={t("pois.searchPlaceholder")} className={cn(styledInput(), "pl-9")} />
        </div>
        <button type="button" onClick={handleOpenCreatePoi}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 transition-opacity shrink-0">
          <Plus className="h-4 w-4" /><span className="hidden sm:inline">{t("pois.createBtn")}</span>
        </button>
      </div>

      {poiSearchResults.length > 0 && (
        <div className="mb-2 rounded-xl border border-stone-100 dark:border-stone-800 overflow-hidden bg-white dark:bg-stone-900" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          {poiSearchResults.map((poi) => {
            const already = formData.poiLinks.some((l) => l.poiId === poi.id);
            return (
              <button key={poi.id} type="button" disabled={already}
                onClick={() => {
                  if (already) return;
                  updateField("poiLinks", [...formData.poiLinks, { poiId: poi.id, roleType: "poi", order: formData.poiLinks.length }]);
                  handlePoiSearch("");
                }}
                className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-left border-b border-stone-50 dark:border-stone-800 last:border-b-0 transition-colors",
                  already ? "opacity-40 cursor-not-allowed" : "hover:bg-amber-50 dark:hover:bg-amber-950/20")}>
                <MapPin className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                <p className="text-sm text-stone-800 dark:text-stone-200 font-medium truncate">{poi.name}</p>
                {already && <span className="ml-auto text-xs text-stone-400 dark:text-stone-500 shrink-0">{t("pois.alreadyAdded")}</span>}
              </button>
            );
          })}
        </div>
      )}

      {formData.poiLinks.length === 0 ? (
        <p className="text-xs text-stone-400">{t("pois.noResults")}</p>
      ) : (
        <div className="space-y-2">
          {formData.poiLinks.map((link, idx) => {
            const poi = allPois.find((p) => p.id === link.poiId);
            return (
              <div key={link.poiId} className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                  <span className="flex-1 text-sm text-stone-700 dark:text-stone-300 truncate">{poi?.name ?? link.poiId}</span>
                  <button type="button" onClick={() => handleOpenEditPoi(link.poiId)}
                    className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors shrink-0" title={t("pois.editBtn")}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => handleOpenDeletePoi(link.poiId, poi?.name ?? link.poiId)}
                    className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors shrink-0" title={t("pois.deleteBtn")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <select value={link.roleType}
                    onChange={(e) => {
                      const next = [...formData.poiLinks];
                      next[idx] = { ...next[idx], roleType: e.target.value };
                      updateField("poiLinks", next);
                    }}
                    className="text-xs border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 outline-none focus:border-amber-400 shrink-0">
                    {poiRoleOptions.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                  </select>
                  <button type="button" onClick={() => updateField("poiLinks", formData.poiLinks.filter((_, i) => i !== idx))}
                    className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors shrink-0" title={t("pois.unlinkBtn")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* POI 弹窗 */}
      <PoiEditModal mode={poiModalMode} open={poiModalOpen}
        onClose={() => { /* handled by parent */ }} onSuccess={handlePoiModalSuccess} initialData={editingPoi} />
      <PoiDeleteConfirm open={deleteConfirmOpen} onClose={() => { /* handled by parent */ }}
        onConfirm={handleConfirmDeletePoi} poiName={deletingPoi?.name ?? ""}
        associationCount={deletingPoiAssociations} isDeleting={isDeletingPoi} />
    </SectionCard>
  );
}
