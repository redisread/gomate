"use client";

import * as React from "react";
import { AlertCircle, ArrowLeft, ImagePlus, Loader2, Plus, Send, X } from "lucide-react";
import { API_BASE, fetchAPI, fetchCurrentUser } from "@/lib/api";
import { FormField, Input, Select, Textarea } from "@/components/ui/form-input";
import { useI18n } from "@/hooks/useI18n";

interface LocationOption {
  id: string;
  name: string;
  slug?: string;
}

interface LocationsResponse {
  success: boolean;
  locations?: LocationOption[];
  data?: LocationOption[];
}

interface CreateStoryResponse {
  success: boolean;
  data?: { id: string };
  error?: { message?: string };
}

interface UploadResponse {
  success: boolean;
  url?: string;
  error?: { message?: string };
}

interface StoryForm {
  title: string;
  summary: string;
  content: string;
  coverImage: string;
  locationId: string;
}

type StoryFormErrors = Partial<Record<keyof StoryForm | "tags", string>>;

const initialForm: StoryForm = {
  title: "",
  summary: "",
  content: "",
  coverImage: "",
  locationId: "",
};

function getApiErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const payload = data as { message?: string; error?: { message?: string } };
    return payload.message || payload.error?.message || fallback;
  }
  return fallback;
}

export function CreateStoryClient() {
  const { t } = useI18n(["content", "common", "ui"]);
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);
  const [locations, setLocations] = React.useState<LocationOption[]>([]);
  const [locationsLoading, setLocationsLoading] = React.useState(true);
  const [form, setForm] = React.useState<StoryForm>(initialForm);
  const [tagInput, setTagInput] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<StoryFormErrors>({});
  const [formError, setFormError] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const user = await fetchCurrentUser(`/login?redirect=${encodeURIComponent("/discover/create")}`);
      if (!user || cancelled) return;
      setIsCheckingAuth(false);
    })();

    fetchAPI("/api/locations?view=card&pageSize=100")
      .then((res) => res.json())
      .then((data: LocationsResponse) => {
        if (cancelled) return;
        if (data.success) setLocations(data.locations ?? data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setLocations([]);
      })
      .finally(() => {
        if (!cancelled) setLocationsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (field: keyof StoryForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const addTag = () => {
    const nextTag = tagInput.trim();
    if (!nextTag) return;
    if (tags.includes(nextTag)) {
      setTagInput("");
      return;
    }
    if (tags.length >= 10) {
      setErrors((prev) => ({ ...prev, tags: t("content.discover.create.tagsMax") }));
      return;
    }
    setTags((prev) => [...prev, nextTag]);
    setTagInput("");
    setErrors((prev) => ({ ...prev, tags: undefined }));
  };

  const removeTag = (tagName: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagName));
    setErrors((prev) => ({ ...prev, tags: undefined }));
  };

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    }
  };

  const validate = () => {
    const nextErrors: StoryFormErrors = {};
    if (!form.title.trim()) nextErrors.title = t("content.discover.create.titleRequired");
    if (!form.summary.trim()) nextErrors.summary = t("content.discover.create.summaryRequired");
    if (!form.content.trim()) nextErrors.content = t("content.discover.create.contentRequired");
    if (!form.coverImage.trim()) nextErrors.coverImage = t("content.discover.create.coverRequired");
    if (!form.locationId) nextErrors.locationId = t("content.discover.create.locationRequired");
    if (tags.length > 10) nextErrors.tags = t("content.discover.create.tagsMax");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError("");
    setErrors((prev) => ({ ...prev, coverImage: undefined }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/upload/story`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json().catch(() => null) as UploadResponse | null;
      if (!res.ok || !data?.success || !data.url) {
        throw new Error(getApiErrorMessage(data, t("content.discover.create.uploadFailed")));
      }
      updateField("coverImage", data.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("content.discover.create.uploadFailed");
      setErrors((prev) => ({ ...prev, coverImage: message }));
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await fetchAPI("/api/stories", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          summary: form.summary,
          content: form.content,
          coverImage: form.coverImage,
          locationId: form.locationId,
          tags,
        }),
      });
      const response = await res.json().catch(() => null) as CreateStoryResponse | null;

      if (res.ok && response?.success && response.data?.id) {
        window.location.href = `/discover/${response.data.id}`;
        return;
      }

      setFormError(getApiErrorMessage(response, t("content.discover.create.submitFailed")));
      setIsSubmitting(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("content.discover.create.submitFailed"));
      setIsSubmitting(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t("content.discover.create.authChecking")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-14">
        <a
          href="/discover"
          className="inline-flex items-center gap-1.5 text-sm mb-6 text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("content.discover.backToDiscover")}
        </a>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Send className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              {t("content.discover.create.title")}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("content.discover.create.subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{formError}</p>
            </div>
          )}

          <FormField
            label={t("content.discover.create.coverLabel")}
            htmlFor="story-cover"
            required
            error={errors.coverImage}
            hint={t("content.discover.create.coverHint")}
          >
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {form.coverImage ? (
                <div className="relative aspect-[16/9] bg-muted">
                  <img
                    src={form.coverImage}
                    alt={t("content.discover.create.coverPreviewAlt")}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => updateField("coverImage", "")}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background"
                    aria-label={t("content.discover.create.removeCover")}
                    disabled={isSubmitting || isUploading}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="story-cover"
                  className="flex aspect-[16/9] cursor-pointer flex-col items-center justify-center gap-3 bg-muted/30 px-4 text-center hover:bg-muted/50 transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium text-foreground">
                    {isUploading ? t("content.discover.create.uploading") : t("content.discover.create.uploadCover")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("content.discover.create.uploadFormat")}
                  </span>
                </label>
              )}
            </div>
            <input
              id="story-cover"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              onChange={handleCoverUpload}
              disabled={isSubmitting || isUploading}
            />
          </FormField>

          <FormField label={t("content.discover.create.titleLabel")} htmlFor="story-title" required error={errors.title}>
            <Input
              id="story-title"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              maxLength={100}
              placeholder={t("content.discover.create.titlePlaceholder")}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField
            label={t("content.discover.create.summaryLabel")}
            htmlFor="story-summary"
            required
            error={errors.summary}
            hint={t("content.discover.create.summaryHint")}
          >
            <Textarea
              id="story-summary"
              value={form.summary}
              onChange={(event) => updateField("summary", event.target.value)}
              maxLength={150}
              className="min-h-[84px]"
              placeholder={t("content.discover.create.summaryPlaceholder")}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label={t("content.discover.create.locationLabel")} htmlFor="story-location" required error={errors.locationId}>
            <Select
              id="story-location"
              value={form.locationId}
              onChange={(event) => updateField("locationId", event.target.value)}
              options={locations.map((location) => ({ value: location.id, label: location.name }))}
              placeholder={locationsLoading ? t("content.discover.create.locationsLoading") : t("content.discover.create.locationPlaceholder")}
              disabled={isSubmitting || locationsLoading}
            />
          </FormField>

          <FormField
            label={t("content.discover.create.contentLabel")}
            htmlFor="story-content"
            required
            error={errors.content}
            hint={t("content.discover.create.contentHint")}
          >
            <Textarea
              id="story-content"
              value={form.content}
              onChange={(event) => updateField("content", event.target.value)}
              maxLength={10000}
              className="min-h-[260px] font-mono text-[13px]"
              placeholder={t("content.discover.create.contentPlaceholder")}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label={t("content.discover.create.tagsLabel")} htmlFor="story-tags" error={errors.tags} hint={t("content.discover.create.tagsHint")}>
            <div className="flex gap-2">
              <Input
                id="story-tags"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={t("content.discover.create.tagsPlaceholder")}
                disabled={isSubmitting || tags.length >= 10}
              />
              <button
                type="button"
                onClick={addTag}
                disabled={isSubmitting || tags.length >= 10 || !tagInput.trim()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={t("content.discover.create.addTag")}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="rounded-full p-0.5 hover:bg-primary/15"
                      aria-label={t("content.discover.create.removeTag", { tag })}
                      disabled={isSubmitting}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </FormField>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <a
              href="/discover"
              className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              {t("common.cancel")}
            </a>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSubmitting ? t("content.discover.create.submitting") : t("content.discover.create.submit")}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
