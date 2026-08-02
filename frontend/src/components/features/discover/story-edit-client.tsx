"use client";

import * as React from "react";
import { ArrowLeft, ChevronDown, ChevronUp, ImagePlus, Loader2, MapPin, Search, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { useI18n } from "@/hooks/useI18n";
import { useToast } from "@/hooks/useToast";
import { FormField, Input, Select, Textarea } from "@/components/ui/form-input";
import { VditorEditor } from "./vditor-editor";
import { StoryToast } from "./story-detail-toast";
import { StoryEditErrorBoundary } from "./story-edit-error-boundary";
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
  const { t } = useI18n(["content"]);
  // task #149 ②：island 渲染异常兜底，不再白屏
  return (
    <StoryEditErrorBoundary
      title={t("content.discover.edit.errorBoundaryTitle")}
      description={t("content.discover.edit.errorBoundaryDesc")}
      reloadLabel={t("content.discover.edit.errorBoundaryReload")}
    >
      <StoryEditClientInner storyId={storyId} />
    </StoryEditErrorBoundary>
  );
}

function StoryEditClientInner({ storyId }: StoryEditClientProps) {
  const { t } = useI18n(["content", "common", "ui"]);
  const { toast, show: showToast, isExiting } = useToast();
  const {
    form, initialForm, isLoading, isSaving, saveResult, uploadMessage, error,
    allTags, locationSearch, locationResults, isSearchingLocation, isUploadingCover, draftAvailable,
    updateField, handleCoverUpload, handleLocationSearch, handleSave,
    handleDiscardDraft, handleRestoreDraft,
  } = useStoryForm(storyId);

  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);
  // spec §5：移动端「基本信息」区折叠（默认只展开标题+摘要），桌面端始终全部展开
  const [basicExpanded, setBasicExpanded] = React.useState(false);
  const closeCancelConfirm = React.useCallback(() => setShowCancelConfirm(false), []);
  // spec §4.1：role=alertdialog + 焦点 trap + Esc + 焦点还原

  // task #149 ③：字段级校验（与发布页 spec §6.2 同一套规则：标题/摘要/正文必填，onBlur 即时校验）
  const [fieldErrors, setFieldErrors] = React.useState<{ title?: string; summary?: string; content?: string }>({});
  // task #149 ①：保存失败 banner 的本地关闭态（新一次失败时重新弹出）
  const [saveErrorDismissed, setSaveErrorDismissed] = React.useState(false);

  const validateRequiredOnBlur = (field: "title" | "summary" | "content") => {
    const errorKey = {
      title: "content.discover.create.titleRequired",
      summary: "content.discover.create.summaryRequired",
      content: "content.discover.create.contentRequired",
    }[field];
    setFieldErrors((prev) => ({ ...prev, [field]: form[field].trim() ? undefined : t(errorKey) }));
  };

  const changeField = (key: "title" | "summary" | "content", value: string) => {
    updateField(key, value);
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  // spec §6.3 对齐发布页：必填项（标题/摘要/正文）为空时保存按钮 disabled
  const isRequiredEmpty = !form.title.trim() || !form.summary.trim() || !form.content.trim();

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

  // 保存成功 → toast；失败 → 内联 banner（持续可见 + 重试，不用易消失的 toast）
  React.useEffect(() => {
    if (saveResult?.type === "success") {
      showToast({ type: "success", message: saveResult.message });
    } else if (saveResult?.type === "error") {
      setSaveErrorDismissed(false);
    }
  }, [saveResult, showToast]);

  // 封面上传提示 → toast
  React.useEffect(() => {
    if (uploadMessage) {
      showToast({ type: "error", message: uploadMessage });
    }
  }, [uploadMessage, showToast]);

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
        <p className="text-muted-foreground">{t(error)}</p>
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
          <div className="flex flex-1 items-center justify-end gap-3 sm:flex-none">
            <button onClick={handleSave} disabled={isSaving || isRequiredEmpty}
              className="btn-primary flex-1 justify-center gap-1.5 px-4 py-2 text-sm disabled:opacity-50 sm:flex-none">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isDirty && !isSaving && (
                // spec §5：未保存提示改为保存按钮上的状态点（移动端不得 hidden）
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary-foreground" />
              )}
              {t("common.save")}
              {isDirty && <span className="sr-only">{t("common.unsavedChanges")}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main: Form + Editor */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Draft Banner */}
        {draftAvailable && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-md border border-border bg-accent px-4 py-3">
            <p className="text-sm text-accent-foreground">{t("content.discover.edit.draftBanner")}</p>
            <div className="flex gap-2">
              <button onClick={handleRestoreDraft} className="btn-primary px-3 py-1 text-xs">{t("content.discover.edit.restoreDraft")}</button>
              <button onClick={handleDiscardDraft} className="btn-ghost px-3 py-1 text-xs">{t("content.discover.edit.discardDraft")}</button>
            </div>
          </div>
        )}

        {/* task #149 ①：保存失败内联 banner（DS v2.0 bg-accent 草稿条同款）+ 重试；内容保留在表单中不丢失 */}
        {saveResult?.type === "error" && !saveErrorDismissed && !isSaving && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-md border border-border bg-accent px-4 py-3">
            <p className="text-sm text-accent-foreground">{saveResult.message}</p>
            <div className="flex gap-2">
              <button onClick={handleSave} className="btn-primary px-3 py-1 text-xs">{t("content.discover.edit.saveRetry")}</button>
              <button onClick={() => setSaveErrorDismissed(true)} className="btn-ghost px-3 py-1 text-xs">{t("common.close")}</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Form fields */}
          <div className="lg:col-span-4 space-y-6">
            <FormField label={t("content.discover.create.titleLabel")} htmlFor="story-edit-title" error={fieldErrors.title}>
              <Input
                id="story-edit-title"
                type="text"
                value={form.title}
                onChange={(e) => changeField("title", e.target.value)}
                onBlur={() => validateRequiredOnBlur("title")}
                placeholder={t("content.discover.edit.titlePlaceholder")}
              />
            </FormField>
            <FormField label={t("content.discover.create.summaryLabel")} htmlFor="story-edit-summary" hint={`${form.summary.length}/150`} error={fieldErrors.summary}>
              <Textarea
                id="story-edit-summary"
                value={form.summary}
                onChange={(e) => changeField("summary", e.target.value)}
                onBlur={() => validateRequiredOnBlur("summary")}
                maxLength={150}
                rows={3}
                placeholder={t("content.discover.edit.summaryPlaceholder")}
                className="min-h-[84px]"
              />
            </FormField>
            {/* spec §5：移动端折叠开关（桌面端隐藏，始终全展开） */}
            <button
              type="button"
              aria-expanded={basicExpanded}
              aria-controls="story-edit-basic-more"
              onClick={() => setBasicExpanded((v) => !v)}
              className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
            >
              {basicExpanded ? t("content.discover.edit.collapseMore") : t("content.discover.edit.expandMore")}
              {basicExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <div
              id="story-edit-basic-more"
              className={cn("space-y-6", !basicExpanded && "max-lg:hidden")}
            >
            <FormField label={t("content.discover.edit.statusLabel")} htmlFor="story-edit-status">
              <Select
                id="story-edit-status"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                options={[
                  { value: "published", label: t("content.discover.edit.statusPublished") },
                  { value: "draft", label: t("content.discover.edit.statusDraft") },
                ]}
              />
            </FormField>
            <FormField label={t("content.discover.create.coverLabel")} htmlFor="story-edit-cover">
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
                  <span className="text-sm">{t("content.discover.create.coverPlaceholder")}</span>
                  <span className="text-xs">{t("content.discover.edit.coverFormatHint")}</span>
                </button>
              )}
              <input ref={coverInputRef} id="story-edit-cover" type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }} />
            </FormField>
            <FormField label={t("content.discover.create.locationLabel")} htmlFor="story-edit-location">
              {form.locationName ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent border border-border">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="flex-1 text-sm text-accent-foreground">{form.locationName}</span>
                  <button onClick={() => { updateField("locationId", ""); updateField("locationName", ""); }} className="text-muted-foreground hover:text-destructive" aria-label={t("content.discover.edit.removeLocation")}>
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
                    placeholder={t("content.discover.edit.locationSearchPlaceholder")}
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
            <FormField label={t("content.discover.create.tagsLabel")} hint={t("content.discover.edit.tagsCountHint", { count: form.tags.length })}>
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
          </div>

          {/* Right: VditorEditor (SV 分屏自带预览) */}
          <div className="lg:col-span-8">
            <div
              className="sticky top-20 rounded-lg border border-border bg-card shadow-card overflow-hidden"
              style={{ height: "calc(100vh - 7rem)" }}
              onBlur={() => validateRequiredOnBlur("content")}
            >
              <VditorEditor
                value={form.content}
                onChange={(v) => changeField("content", v)}
                placeholder={t("content.discover.edit.contentPlaceholder")}
              />
            </div>
            {fieldErrors.content && (
              <p className="mt-2 text-xs text-destructive">{fieldErrors.content}</p>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <Modal
          open={showCancelConfirm}
          onClose={closeCancelConfirm}
          role="alertdialog"
          labelledBy="cancel-edit-title"
          describedBy="cancel-edit-desc"
          overlayClassName="flex items-center justify-center"
          panelClassName="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
        >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 id="cancel-edit-title" className="font-semibold text-foreground">{t("content.discover.edit.cancelTitle")}</h3>
                <p id="cancel-edit-desc" className="text-sm text-muted-foreground">{t("content.discover.edit.cancelDesc")}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={closeCancelConfirm} className="px-4 py-2 rounded-md border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors">
                {t("content.discover.edit.continueEditing")}
              </button>
              <button onClick={confirmDiscard} className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors">
                {t("content.discover.edit.discardConfirm")}
              </button>
            </div>
    </Modal>
      )}
    </div>
  );
}
