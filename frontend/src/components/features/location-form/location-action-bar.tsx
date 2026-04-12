"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

interface LocationActionBarProps {
  isDirty: boolean;
  isSaving: boolean;
  lastSaved?: string;
  onSave: () => void;
  onDiscard: () => void;
}

export function LocationActionBar({ isDirty, isSaving, lastSaved, onSave, onDiscard }: LocationActionBarProps) {
  return (
    <>
      {/* 移动端备选保存按钮（未触发 StickyActionBar 时） */}
      {!isDirty && (
        <button type="button" onClick={onSave} disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-500 transition-opacity disabled:opacity-60">
          {isSaving ? (<><Loader2 className="h-4 w-4 animate-spin" />{copy.admin.saving}</>) : copy.admin.save}
        </button>
      )}
    </>
  );
}
