"use client";

import { useId } from "react";
import {
  POSTER_PRESET_IDS,
  type PosterPresetId,
} from "@/contracts/share-image";
import { useI18n } from "@/hooks/useI18n";

interface PosterPresetSelectorProps {
  value: PosterPresetId;
  onChange: (value: PosterPresetId) => void;
  disabled?: boolean;
}

const PRESENTATION: Record<PosterPresetId, { nameKey: string; descriptionKey: string; swatch: [string, string] }> = {
  dusk: {
    nameKey: "share.posterPresetDusk",
    descriptionKey: "share.posterPresetDuskDescription",
    swatch: ["bg-brand", "bg-primary"],
  },
  ridge: {
    nameKey: "share.posterPresetRidge",
    descriptionKey: "share.posterPresetRidgeDescription",
    swatch: ["bg-success", "bg-brand"],
  },
  journal: {
    nameKey: "share.posterPresetJournal",
    descriptionKey: "share.posterPresetJournalDescription",
    swatch: ["bg-warm", "bg-destructive"],
  },
};

export function PosterPresetSelector({
  value,
  onChange,
  disabled = false,
}: PosterPresetSelectorProps) {
  const { t } = useI18n(["share"]);
  const groupName = useId();

  return (
    <fieldset aria-label={t("share.posterPresetLabel")} disabled={disabled}>
      <legend className="mb-2 text-sm font-medium text-stone-700">
        {t("share.posterPresetLabel")}
      </legend>
      <div className="grid grid-cols-3 gap-2">
        {POSTER_PRESET_IDS.map((preset) => {
          const presentation = PRESENTATION[preset];
          return (
            <label key={preset} className="relative min-w-0 cursor-pointer">
              <input
                type="radio"
                name={groupName}
                value={preset}
                checked={value === preset}
                onChange={() => onChange(preset)}
                className="peer sr-only"
              />
              <span className="flex min-h-11 flex-col rounded-lg border border-stone-200 bg-white p-2 text-start transition-colors peer-checked:border-amber-600 peer-checked:ring-1 peer-checked:ring-amber-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                <span aria-hidden="true" className="mb-1.5 flex h-2.5 w-full overflow-hidden rounded-full">
                  <span className={`h-full flex-1 ${presentation.swatch[0]}`} />
                  <span className={`h-full flex-1 ${presentation.swatch[1]}`} />
                </span>
                <span className="truncate text-xs font-semibold text-stone-800">
                  {t(presentation.nameKey)}
                </span>
                <span className="mt-0.5 line-clamp-2 text-[10px] leading-3 text-stone-500">
                  {t(presentation.descriptionKey)}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
