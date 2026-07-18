"use client";

import * as React from "react";
import { AlertCircle, ArrowLeft, Loader2, Plus, Send, X } from "lucide-react";
import { API_BASE, fetchAPI, fetchCurrentUser } from "@/lib/api";
import { FormField, Input, Select, Textarea } from "@/components/ui/form-input";
import { useI18n } from "@/hooks/useI18n";
import { VditorEditor } from "./discover/vditor-editor";

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

  // spec §6.3：封面/标签不再参与校验；disabled 只看标题/摘要/正文
  const validate = () => {
    const nextErrors: StoryFormErrors = {};
    if (!form.title.trim()) nextErrors.title = t("content.discover.create.titleRequired");
    if (!form.summary.trim()) nextErrors.summary = t("content.discover.create.summaryRequired");
    if (!form.content.trim()) nextErrors.content = t("content.discover.create.contentRequired");
    if (!form.locationId) nextErrors.locationId = t("content.discover.create.locationRequired");
    if (tags.length > 10) nextErrors.tags = t("content.discover.create.tagsMax");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // spec §6.3：onBlur 即时校验必填项，错误消除即恢复（恢复由 updateField 负责）
  const validateRequiredOnBlur = (field: "title" | "summary" | "content") => {
    const errorKey = {
      title: "content.discover.create.titleRequired",
      summary: "content.discover.create.summaryRequired",
      content: "content.discover.create.contentRequired",
    }[field];
    setErrors((prev) => ({ ...prev, [field]: form[field].trim() ? undefined : t(errorKey) }));
  };

  const isRequiredEmpty = !form.title.trim() || !form.summary.trim() || !form.content.trim();

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
      const data = await res.json();
      if (data.success && data.url) {
        setForm((prev) => ({ ...prev, coverImage: data.url }));
      } else {
        setFormError(getApiErrorMessage(data, t("content.discover.create.uploadFailed")));
        setErrors((prev) => ({ ...prev, coverImage: t("content.discover.create.uploadFailed") }));
      }
    } catch {
      setFormError(t("content.discover.create.uploadFailed"));
      setErrors((prev) => ({ ...prev, coverImage: t("content.discover.create.uploadFailed") }));
    } finally {
      if (!cancelledRef.current) {
        setIsUploading(false);
      }
    }
  };

  // Use a ref to track cancellation for cleanup
  const cancelledRef = React.useRef(false);
  React.useEffect(() => {
    return () => { cancelledRef.current = true; };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title.trim(),
          summary: form.summary.trim(),
          content: form.content,
          coverImage: form.coverImage || undefined,
          locationId: form.locationId,
          tags,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.data?.id) {
        window.location.href = `/discover/${data.data.id}`;
      } else {
        setFormError(getApiErrorMessage(data, t("content.discover.create.submitFailed")));
      }
    } catch {
      setFormError(t("content.discover.create.submitFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-card backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/discover" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t("content.discover.back")}
          </a>
          <h1 className="text-base font-semibold text-foreground">{t("content.discover.create.title")}</h1>
          <div className="w-20" />
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {formError && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Form fields */}
          <div className="lg:col-span-4 space-y-6">
            <FormField
              label={t("content.discover.create.titleLabel")}
              htmlFor="story-title"
              error={errors.title}
            >
              <Input
                id="story-title"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                onBlur={() => validateRequiredOnBlur("title")}
                placeholder={t("content.discover.create.titlePlaceholder")}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField
              label={t("content.discover.create.coverLabel")}
              htmlFor="story-cover"
              optional
              error={errors.coverImage}
              hint={t("content.discover.create.coverHint")}
            >
              {form.coverImage ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={form.coverImage} alt="Cover" className="w-full aspect-video object-cover" />
                  <button
                    type="button"
                    onClick={() => updateField("coverImage", "")}
                    aria-label={t("content.discover.create.removeCover")}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                /* spec §6.2：空态虚线占位框，120px 移动 / 160px 桌面 */
                <label className="flex h-[120px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-secondary/50 transition-colors hover:border-primary/40 sm:h-40">
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <span className="text-sm font-medium text-foreground">{t("content.discover.create.coverEmptyTitle")}</span>
                      <span className="text-xs text-muted-foreground">{t("content.discover.create.coverEmptyHint")}</span>
                    </>
                  )}
                  <input
                    id="story-cover"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleCoverUpload}
                    disabled={isUploading || isSubmitting}
                  />
                </label>
              )}
            </FormField>

            <FormField
              label={t("content.discover.create.summaryLabel")}
              htmlFor="story-summary"
              error={errors.summary}
              hint={t("content.discover.create.summaryHint")}
            >
              <Textarea
                id="story-summary"
                value={form.summary}
                onChange={(event) => updateField("summary", event.target.value)}
                onBlur={() => validateRequiredOnBlur("summary")}
                maxLength={150}
                className="min-h-[84px]"
                placeholder={t("content.discover.create.summaryPlaceholder")}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField
              label={t("content.discover.create.locationLabel")}
              htmlFor="story-location"
              error={errors.locationId}
            >
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
              label={t("content.discover.create.tagsLabel")}
              htmlFor="story-tags"
              optional
              error={errors.tags}
              hint={t("content.discover.create.tagsHint")}
            >
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
                disabled={isSubmitting || isUploading || isRequiredEmpty}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSubmitting ? t("content.discover.create.submitting") : t("content.discover.create.submit")}
              </button>
            </div>
          </div>

          {/* Right: VditorEditor (SV 分屏自带预览) */}
          <div className="lg:col-span-8">
            <FormField
              label={t("content.discover.create.contentLabel")}
              htmlFor="story-content"
              error={errors.content}
              hint={t("content.discover.create.contentHint")}
            >
              <div className="rounded-lg border border-border overflow-hidden" style={{ height: "calc(100vh - 10rem)", minHeight: "500px" }} onBlur={() => validateRequiredOnBlur("content")}>
                <VditorEditor
                  value={form.content}
                  onChange={(v) => updateField("content", v)}
                  placeholder={t("content.discover.create.contentPlaceholder")}
                />
              </div>
            </FormField>
          </div>
        </form>
      </main>
    </div>
  );
}
