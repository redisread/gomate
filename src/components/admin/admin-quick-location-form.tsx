"use client";

import * as React from "react";

import { useI18n } from "@/hooks/useI18n";
import { fetchAPI } from "@/lib/api";
import { adminCatchMessage, adminJsonOrThrow } from "@/lib/admin-i18n";
import { fetchSelectableRegions } from "@/lib/regions";
import { ACTIVITY_TYPES, type ActivityType } from "@/contracts";
import type { Location, Region, Tag } from "@/lib/types";

interface AdminQuickLocationFormProps {
  initialFocusRef: React.RefObject<HTMLInputElement>;
}

export function AdminQuickLocationForm({
  initialFocusRef,
}: AdminQuickLocationFormProps) {
  const { t } = useI18n(["admin", "enums"]);
  const [regions, setRegions] = React.useState<Region[]>([]);
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [regionId, setRegionId] = React.useState("");
  const [coverImageUrl, setCoverImageUrl] = React.useState("");
  const [tagIds, setTagIds] = React.useState<string[]>([]);
  const [activityTypeIds, setActivityTypeIds] = React.useState<ActivityType[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [created, setCreated] = React.useState<Location | null>(null);
  const [optionalSaveFailed, setOptionalSaveFailed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      fetchSelectableRegions(),
      fetchAPI("/tags?limit=200").then((response) =>
        adminJsonOrThrow<{ tags?: Tag[] }>(response, t, "admin.management.loadFailed"),
      ),
    ]).then(([nextRegions, tagData]) => {
      if (!active) return;
      setRegions(nextRegions);
      setTags((tagData as { tags?: Tag[] }).tags ?? []);
    }).catch(() => {
      if (active) setError(t("admin.management.loadFailed"));
    });
    return () => { active = false; };
  }, [t]);

  const toggle = <T extends string,>(
    value: T,
    selected: T[],
    update: React.Dispatch<React.SetStateAction<T[]>>,
  ) => update(selected.includes(value)
    ? selected.filter((candidate) => candidate !== value)
    : [...selected, value]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const createResponse = await fetchAPI("/locations", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          regionId,
          status: "draft",
          supportedActivityTypes: activityTypeIds,
          coverImageUrl: coverImageUrl.trim() || null,
        }),
      });
      const result = await adminJsonOrThrow<{ success: true; location: Location }>(
        createResponse,
        t,
        "admin.management.saveFailed",
      );
      setCreated(result.location);
      if (tagIds.length > 0) {
        try {
          const tagsResponse = await fetchAPI(`/locations/${result.location.id}/tags`, {
            method: "PUT",
            body: JSON.stringify({ tagIds }),
          });
          await adminJsonOrThrow(tagsResponse, t, "admin.quickDraft.optionalSaveFailed");
        } catch {
          setOptionalSaveFailed(true);
        }
      }
    } catch (cause) {
      setError(adminCatchMessage(cause, t, "admin.management.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <div role="status" className="space-y-4">
        <p className="rounded-lg bg-primary/10 p-3 text-sm font-medium text-foreground">
          {t("admin.quickDraft.saved")}
        </p>
        {optionalSaveFailed && (
          <p role="alert" className="rounded-lg bg-amber-500/10 p-3 text-sm text-foreground">
            {t("admin.quickDraft.optionalSaveFailed")}
          </p>
        )}
        <a href={`/admin/locations/${created.id}/edit`} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
          {t("admin.quickDraft.continueEditing")}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="grid gap-1.5 text-sm font-medium">
        {t("admin.quickDraft.name")}
        <input ref={initialFocusRef} required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-3" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        {t("admin.quickDraft.description")}
        <textarea required maxLength={10_000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        {t("admin.quickDraft.region")}
        <select required value={regionId} onChange={(event) => setRegionId(event.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-3">
          <option value="">{t("admin.quickDraft.chooseRegion")}</option>
          {regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
        </select>
      </label>

      <details className="rounded-lg border border-border p-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">{t("admin.quickDraft.optionalFields")}</summary>
        <div className="mt-3 space-y-4">
          <label className="grid gap-1.5 text-sm font-medium">
            {t("admin.quickDraft.cover")}
            <input type="url" inputMode="url" placeholder="https://" value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-3" />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("admin.quickDraft.activityTypes")}</legend>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_TYPES.map((activityType) => (
                <label key={activityType} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm">
                  <input type="checkbox" checked={activityTypeIds.includes(activityType)} onChange={() => toggle(activityType, activityTypeIds, setActivityTypeIds)} />
                  {t(`enums.locationType.${activityType}`)}
                </label>
              ))}
            </div>
          </fieldset>
          {tags.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t("admin.quickDraft.tags")}</legend>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <label key={tag.id} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm">
                    <input type="checkbox" checked={tagIds.includes(tag.id)} onChange={() => toggle(tag.id, tagIds, setTagIds)} />
                    {tag.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      </details>

      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <button disabled={saving} className="min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        {t(saving ? "admin.quickDraft.saving" : "admin.quickDraft.save")}
      </button>
    </form>
  );
}
