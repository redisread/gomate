"use client";

import { SectionCard, Field } from "./location-form-layout";


import { ImageIcon } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { FormData } from "./location-form-data";
import { CoverImageUpload } from "@/components/ui/cover-image-upload";
import { MultiImageUpload } from "@/components/ui/multi-image-upload";
import { SeasonPicker } from "@/components/ui/season-picker";

interface LocationFormContentFieldsProps {
  formData: FormData;
  errors: Record<string, string | undefined>;
  isSaving: boolean;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}

export function LocationFormContentFields({ formData, errors, isSaving, updateField }: LocationFormContentFieldsProps) {
  const { t } = useI18n(["admin", "ui"]);
  return (
    <SectionCard icon={<ImageIcon className="h-4 w-4" />} title={t("admin.formContentTitle")}>
      <Field label={t("admin.formCoverImageRequired")} hint={t("ui.selectFromAlbum")} error={errors.coverImageUrl} fieldId="coverImageUrl">
        <CoverImageUpload value={formData.coverImageUrl} onChange={(url) => updateField("coverImageUrl", url)} disabled={isSaving} />
      </Field>
      <Field label={t("admin.formAlbumTitle")} hint={t("ui.coverHint")}>
        <MultiImageUpload values={formData.images} onChange={(urls) => updateField("images", urls)}
          max={9} disabled={isSaving} coverImage={formData.coverImageUrl} onSetCover={(url) => updateField("coverImageUrl", url)} />
      </Field>
      <Field label={t("admin.formBestSeason")} hint={t("admin.seasonSelectHint")}>
        <SeasonPicker value={formData.extra.hiking.bestSeasons}
          onChange={(bestSeasons) => updateField("extra", {
            ...formData.extra,
            hiking: { ...formData.extra.hiking, bestSeasons },
          })}
          disabled={isSaving} />
      </Field>
    </SectionCard>
  );
}
