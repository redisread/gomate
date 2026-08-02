"use client";

import { Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

/** 将 Date 格式化为相对时间文字 */
function formatRelativeTime(date: Date, t: (key: string) => string): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return t("common.justNow");
  if (diffMin < 60) return t("common.minutesAgo").replace("{count}", String(diffMin));

  const diffHour = Math.floor(diffMin / 60);
  return t("common.hoursAgo").replace("{count}", String(diffHour));
}

interface StickyActionBarProps {
  /** 是否有未保存更改 */
  isDirty: boolean;
  /** 是否正在保存 */
  isSaving: boolean;
  /** 最后自动保存时间 */
  lastSaved: Date | null;
  /** 保存回调 */
  onSave: () => void;
  /** 放弃更改回调 */
  onDiscard: () => void;
}

/**
 * 粘性底部操作栏
 *
 * isDirty=true 时从底部滑入，isDirty=false 时滑出隐藏。
 * 支持自动保存时间展示及 iOS 安全区适配。
 */
export function StickyActionBar({
  isDirty,
  isSaving,
  lastSaved,
  onSave,
  onDiscard,
}: StickyActionBarProps) {
  const { t } = useI18n(["common"]);
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-white/95 backdrop-blur-md border-t border-stone-100",
        "transition-transform duration-300",
        isDirty ? "translate-y-0" : "translate-y-full"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-hidden={!isDirty}
    >
      <div className="flex items-center justify-between px-4 py-3 max-w-3xl mx-auto">
        {/* 左侧：状态指示 */}
        <div className="flex items-center gap-2 min-w-0">
          {/* 橙色脉冲点 */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>

          <span className="text-sm text-stone-600 truncate">
            {lastSaved !== null
              ? `${t("common.draftAutoSaved")} · ${formatRelativeTime(lastSaved, t)}`
              : t("common.unsavedChanges")}
          </span>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {/* 放弃更改 */}
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving}
            className="text-sm text-stone-500 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors rounded-md px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("common.discardChanges")}
          </button>

          {/* 保存更改 */}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium",
              "bg-amber-500 hover:bg-amber-600 text-white",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "transition-colors"
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("common.savingChanges")}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{t("common.saveChanges")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
