"use client";

import * as React from "react";
import { MapPin } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { FormData } from "./use-location-form";

const PARKING_INFO_MAX = 80;

interface LocationFormParkingFieldsProps {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}

export function LocationFormParkingFields({
  formData,
  updateField,
}: LocationFormParkingFieldsProps) {
  const { t } = useI18n(["admin"]);
  const [open, setOpen] = React.useState(true);
  const parkingInfoEditable = formData.parkingAvailable === true;

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 px-5 py-4 text-left transition-colors hover:bg-stone-50/60 dark:hover:bg-stone-800/60"
      >
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          <MapPin className="h-4 w-4" />
        </span>
        <span className="flex-1 text-sm font-semibold text-stone-800 dark:text-stone-200">
          {t("admin.formParkingSectionTitle")}
        </span>
        <svg
          className={cn(
            "h-4 w-4 text-stone-400 transition-transform",
            open && "rotate-180",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="space-y-4 border-t border-stone-50 px-5 pb-5 pt-4 dark:border-stone-800">
          <fieldset className="space-y-1.5">
            <legend className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              {t("admin.formParkingLabel")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: true, key: "formParkingOptionYes" },
                  { value: false, key: "formParkingOptionNo" },
                  { value: null, key: "formParkingOptionUnknown" },
                ] as const
              ).map((option) => {
                const selected = formData.parkingAvailable === option.value;
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      updateField("parkingAvailable", option.value);
                      if (option.value === false && formData.parkingInfo) {
                        updateField("parkingInfo", "");
                      }
                    }}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                      selected
                        ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                        : "border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700",
                    )}
                  >
                    {t(`admin.${option.key}`)}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-stone-400">
              {t("admin.formParkingHint")}
            </p>
          </fieldset>

          <div className="space-y-1.5">
            <label
              htmlFor="location-parking-info"
              className="block text-xs font-semibold text-stone-700 dark:text-stone-300"
            >
              {t("admin.formParkingInfoLabel")}
            </label>
            <input
              id="location-parking-info"
              type="text"
              value={formData.parkingInfo}
              maxLength={PARKING_INFO_MAX}
              disabled={!parkingInfoEditable}
              onChange={(event) =>
                updateField("parkingInfo", event.target.value)
              }
              placeholder={t("admin.formParkingInfoPlaceholder")}
              className={cn(
                "w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:placeholder:text-stone-500",
                parkingInfoEditable
                  ? "border-stone-200 bg-white text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  : "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 opacity-50 dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-500",
              )}
            />
            <p className="text-xs text-stone-400">
              {t("admin.formParkingInfoHint")}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
