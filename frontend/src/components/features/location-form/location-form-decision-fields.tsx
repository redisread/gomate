"use client";

/**
 * P0-B T4 (task #171) 决策信息 —— 地点编辑页第 4 个 SectionCard
 *
 * spec 依据：
 *  - gomate-p0bcd-2026-07-20-spec.md §8：字段/DB/API
 *  - gomate/p0b-t4-admin-form-patch-spec.md §2：UI 规范（独立组件、UI required 1-8 项、
 *    gearItem ≤12 字）
 *
 * 关键约束：
 *  - 徒步地点至少填写 1 项必带装备；非徒步地点允许省略 hiking extra。
 *  - 每项 ≤12 字、上限 8 项。
 */

import * as React from "react";
import { Backpack, Plus, GripVertical, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { FormData } from "./use-location-form";

const GEAR_MAX = 8;
const GEAR_ITEM_MAX = 12;

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

interface GearListProps {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  chipTone: "amber" | "stone";
  inputSlotId: string;
  showToast: (type: "success" | "error", message: string) => void;
  moveItem: (arr: string[], from: number, to: number) => string[];
  addLabel: string;
  maxError: string;
  deletedText: string;
  deleteLabel: string;
}

function GearList({ items, onChange, placeholder, chipTone, inputSlotId, showToast, moveItem, addLabel, maxError, deletedText, deleteLabel }: GearListProps) {
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (fromIdx === dropIdx) return;
    onChange(moveItem(items, fromIdx, dropIdx));
  };
  const rowBg = chipTone === "amber"
    ? "bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70 dark:hover:bg-amber-950/40"
    : "bg-stone-50/50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-700/50";
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} draggable
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, idx)}
          className={cn("flex items-center gap-1.5 rounded-lg transition-colors cursor-grab active:cursor-grabbing p-1", rowBg)}>
          <GripVertical className="h-3.5 w-3.5 text-stone-300 shrink-0" />
          <input type="text" data-slot={inputSlotId} value={item} maxLength={GEAR_ITEM_MAX}
            onChange={(e) => {
              const next = [...items]; next[idx] = e.target.value;
              onChange(next);
            }}
            onBlur={() => {
              if (item.trim() === "") {
                onChange(items.filter((_, i) => i !== idx));
              }
            }}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 border bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 border-stone-200 dark:border-stone-700 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 flex-1" />
          <button type="button" onClick={() => {
            onChange(items.filter((_, i) => i !== idx));
            showToast("success", deletedText);
          }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
            aria-label={deleteLabel}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
      {items.length < GEAR_MAX ? (
        <button type="button" onClick={() => {
          onChange([...items, ""]);
          setTimeout(() => {
            const inputs = document.querySelectorAll<HTMLInputElement>(`[data-slot="${inputSlotId}"]`);
            const last = inputs[inputs.length - 1];
            last?.focus();
          }, 0);
        }}
          className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 transition-colors">
          <Plus className="h-3.5 w-3.5" />{addLabel}
        </button>
      ) : (
        <p className="text-xs text-red-500">{maxError}</p>
      )}
    </div>
  );
}

interface LocationFormDecisionFieldsProps {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}

export function LocationFormDecisionFields({ formData, updateField }: LocationFormDecisionFieldsProps) {
  const { t } = useI18n(["admin"]);
  const [toast, setToast] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = React.useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const moveItem = React.useCallback((arr: string[], from: number, to: number) => {
    const next = [...arr];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }, []);

  const hikingSelected = formData.supportedActivityTypes.includes("hiking");
  const essentialEmpty = hikingSelected && formData.extra.hiking.gearEssential.filter((v) => v.trim()).length === 0;

  const updateHiking = React.useCallback((changes: Partial<FormData["extra"]["hiking"]>) => {
    updateField("extra", {
      ...formData.extra,
      hiking: { ...formData.extra.hiking, ...changes },
    });
  }, [formData.extra, updateField]);

  return (<>
    <SectionCard icon={<Backpack className="h-4 w-4" />} title={t("admin.formDecisionTitle")} collapsible defaultOpen={true}>
      <div className="space-y-4">
        {/* 必带装备 gearEssential — UI required 1-8 项 */}
        <Field label={t("admin.formGearEssentialLabel")} required={hikingSelected}
          hint={t("admin.formGearEssentialHint")}
          error={essentialEmpty ? t("admin.formGearEssentialRequired") : undefined}>
          <GearList
            items={formData.extra.hiking.gearEssential}
            onChange={(gearEssential) => updateHiking({ gearEssential })}
            placeholder={t("admin.formGearEssentialPlaceholder")}
            chipTone="amber"
            inputSlotId="gear-essential"
            showToast={showToast}
            moveItem={moveItem}
            addLabel={t("admin.formGearAdd")}
            maxError={t("admin.formGearMaxError")}
            deletedText={t("admin.deleteSuccessToast")}
            deleteLabel={t("admin.delete")}
          />
        </Field>

        {/* 选带装备 gearOptional — 0-8 项 */}
        <Field label={t("admin.formGearOptionalLabel")} hint={t("admin.formGearOptionalHint")}>
          <GearList
            items={formData.extra.hiking.gearOptional}
            onChange={(gearOptional) => updateHiking({ gearOptional })}
            placeholder={t("admin.formGearOptionalPlaceholder")}
            chipTone="stone"
            inputSlotId="gear-optional"
            showToast={showToast}
            moveItem={moveItem}
            addLabel={t("admin.formGearAdd")}
            maxError={t("admin.formGearMaxError")}
            deletedText={t("admin.deleteSuccessToast")}
            deleteLabel={t("admin.delete")}
          />
        </Field>
      </div>
    </SectionCard>
    {toast && (
      <div className="fixed bottom-5 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-[slide-up-toast_0.25s_ease-out_both]">
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-card px-4 py-3 text-sm font-medium shadow-warm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
          <span>{toast.message}</span>
        </div>
      </div>
    )}
  </>);
}
