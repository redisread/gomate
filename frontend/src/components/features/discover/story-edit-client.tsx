"use client";

import * as React from "react";
import { ArrowLeft, ImagePlus, Loader2, MapPin, Search, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { useToast } from "@/hooks/useToast";
import { FormField, Input, Select, Textarea } from "@/components/ui/form-input";
import { VditorEditor } from "./vditor-editor";
import { StoryToast } from "./story-detail-toast";
import { useStoryForm } from "./use-story-form";
import type { FormFields } from "./use-story-form";

interface StoryEditClientProps {
  storyId: string;
}

function areFormsEqual(a: FormFields, b: FormFields): boolean {
  if (!a || !b) return true;
  return a.title === b.title && a.summary === b.summary && a.content === b.content
    && a.coverImage === b.coverImage && a.locationId === b.locationId
    && a.status === b.status && JSON.stringify(a.tags) === JSON.stringify(b.tags);
}

export function StoryEditClient({ storyId }: StoryEditClientProps) {
  const { t } = useI18n(["content", "common", "ui"]);
  const { toast, show: showToast, isExiting } = useToast();
  const {
    form, initialForm, isLoading, isSaving, saveMessage, error,
    allTags, locationSearch, locationResults, isSearchingLocation, isUploadingCover, draftAvailable,
    updateField, handleCoverUpload, handleLocationSearch, handleSave,
    handleDiscardDraft, handleRestoreDraft,
  } = useStoryForm(storyId);

  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);

  // Dirty detection
  const isDirty = React.useMemo(() => {
    if (!initialForm.current) return false;
    return !areFormsEqual(form, initialForm.current);
  }, [form, initialForm]);

  // beforeunload
  React.useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Sync saveMessage to toast
  React.useEffect(() => {
    if (saveMessage) {
      showToast({
        type: saveMessage.includes("成功") ? "success" : "error",
        message: saveMessage,
      });
    }
  }, [saveMessage, showToast]);

  const handleBack = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      window.location.href = `/discover/${storyId}`;
    }
  };

  const confirmDiscard = () => {
    setShowCancelConfirm(false);
    window.location.href = `/discover/${storyId}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StoryToast toast={toast} exiting={isExiting} />

      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-card backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button onClick={handleBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </button>
          <div className="flex items-center gap-3">
            {isDirty && <span className="text-xs text-accent-foreground hidden sm:inline">有未保存的修改</span>}
            <button onClick={handleSave} disabled={isSaving}
              className="btn-primary gap-1.5 px-4 py-2 text-sm disabled:opacity-50">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common.save")}
            </button>
          </div>
        </div>
      </div>

      {/* Main: Form + Editor */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Draft Banner */}
        {draftAvailable && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-md border border-border bg-accent px-4 py-3">
            <p className="text-sm text-accent-foreground">检测到未保存的草稿</p>
            <div className="flex gap-2">
              <button onClick={handleRestoreDraft} className="btn-primary px-3 py-1 text-xs">恢复草稿</button>
              <button onClick={handleDiscardDraft} className="btn-ghost px-3 py-1 text-xs">丢弃</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Form fields */}
          <div className="lg:col-span-4 space-y-6">
            <FormField label="标题" htmlFor="story-edit-title">
              <Input
                id="story-edit-title"
                type="text"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="故事标题"
              />
            </FormField>
            <FormField label="摘要" htmlFor="story-edit-summary" hint={`${form.summary.length}/150`}>
              <Textarea
                id="story-edit-summary"
                value={form.summary}
                onChange={(e) => updateField("summary", e.target.value)}
                maxLength={150}
                rows={3}
                placeholder="简短描述..."
                className="min-h-[84px]"
              />
            </FormField>
            <FormField label="状态" htmlFor="story-edit-status">
              <Select
                id="story-edit-status"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                options={[
                  { value: "published", label: "已发布" },
                  { value: "draft", label: "草稿" },
                ]}
              />
            </FormField>
            <FormField label="封面图" htmlFor="story-edit-cover">
              {form.coverImage ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={form.coverImage} alt="Cover" className="w-full aspect-video object-cover" />
                  <button
                    type="button"
                    onClick={() => updateField("coverImage", "")}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="w-full aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/40 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary disabled:opacity-50"
                >
                  {isUploadingCover
                    ? <Loader2 className="h-6 w-6 animate-spin" />
                    : <ImagePlus className="h-6 w-6" />}
                  <span className="text-sm">点击上传封面图</span>
                  <span className="text-xs">JPG/PNG，≤2MB</span>
                </button>
              )}
              <input ref={coverInputRef} id="story-edit-cover" type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }} />
            </FormField>
            <FormField label="关联地点" htmlFor="story-edit-location">
              {form.locationName ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent border border-border">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="flex-1 text-sm text-accent-foreground">{form.locationName}</span>
                  <button onClick={() => { updateField("locationId", ""); updateField("locationName", ""); }} className="text-muted-foreground hover:text-destructive" aria-label="移除关联地点">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id="story-edit-location"
                    type="text"
                    value={locationSearch}
                    onChange={(e) => handleLocationSearch(e.target.value)}
                    placeholder="搜索地点..."
                    leftIcon={<Search className="h-4 w-4" />}
                    rightIcon={isSearchingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                  />
                  {locationResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-card overflow-hidden">
                      {locationResults.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => { updateField("locationId", loc.id); updateField("locationName", loc.name); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                        >
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          {loc.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </FormField>
            <FormField label="标签" hint={`${form.tags.length}/10 最多`}>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const selected = form.tags.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        updateField("tags", selected ? form.tags.filter((t) => t !== tag.name) : [...form.tags, tag.name].slice(0, 10));
                      }}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                        selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
                      )}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </FormField>
          </div>

          {/* Right: VditorEditor (SV 分屏自带预览) */}
          <div className="lg:col-span-8">
            <div className="sticky top-20 rounded-lg border border-border bg-card shadow-card overflow-hidden" style={{ height: "calc(100vh - 7rem)" }}>
              <VditorEditor
                value={form.content}
                onChange={(v) => updateField("content", v)}
                placeholder="用 Markdown 写下你的故事..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCancelConfirm(false)}>
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">放弃编辑？</h3>
                <p className="text-sm text-muted-foreground">当前修改将不会保存</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCancelConfirm(false)} className="px-4 py-2 rounded-md border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors">
                继续编辑
              </button>
              <button onClick={confirmDiscard} className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors">
                放弃
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
