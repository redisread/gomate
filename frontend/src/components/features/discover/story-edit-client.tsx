"use client";

import * as React from "react";
import { ArrowLeft, ImagePlus, Loader2, MapPin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { MarkdownContent } from "./markdown-content";
import { useStoryForm } from "./use-story-form";

interface StoryEditClientProps {
  storyId: string;
}

export function StoryEditClient({ storyId }: StoryEditClientProps) {
  const { t } = useI18n(["content", "common", "ui"]);
  const {
    form, isLoading, isSaving, saveMessage, error,
    allTags, locationSearch, locationResults, isSearchingLocation, isUploadingCover, draftAvailable,
    updateField, handleCoverUpload, handleLocationSearch, handleSave, handleDiscardDraft, handleRestoreDraft,
  } = useStoryForm(storyId);

  const coverInputRef = React.useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50/30 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50/30 to-white">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/30 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border/60 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button onClick={() => { window.location.href = `/discover/${storyId}`; }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </button>
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span className={cn("text-sm", saveMessage.includes("成功") ? "text-emerald-600" : "text-red-600")}>{saveMessage}</span>
            )}
            <button onClick={handleSave} disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common.save")}
            </button>
          </div>
        </div>
      </div>

      {/* Draft Banner */}
      {draftAvailable && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <p className="text-sm text-amber-800">检测到未保存的草稿</p>
            <div className="flex gap-2">
              <button onClick={handleRestoreDraft} className="px-3 py-1 text-xs font-medium rounded-md bg-amber-500 text-white hover:bg-amber-600">恢复草稿</button>
              <button onClick={handleDiscardDraft} className="px-3 py-1 text-xs font-medium rounded-md border border-amber-300 text-amber-700 hover:bg-amber-100">丢弃</button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Form */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">标题</label>
              <input type="text" value={form.title} onChange={(e) => updateField("title", e.target.value)} maxLength={100}
                placeholder="输入故事标题" className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400" />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">摘要</label>
              <textarea value={form.summary} onChange={(e) => updateField("summary", e.target.value)} maxLength={150} rows={3}
                placeholder="输入故事摘要（最多 150 字）" className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 resize-none" />
              <span className="text-xs text-muted-foreground">{form.summary.length}/150</span>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">正文（Markdown）</label>
              <textarea value={form.content} onChange={(e) => updateField("content", e.target.value)} maxLength={10000} rows={12}
                placeholder="使用 Markdown 编写故事内容" className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 resize-y font-mono" />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">状态</label>
              <select value={form.status} onChange={(e) => updateField("status", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400">
                <option value="published">已发布</option>
                <option value="draft">草稿</option>
                <option value="hidden">隐藏</option>
              </select>
            </div>

            {/* Cover */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">封面图</label>
              {form.coverImage ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={form.coverImage} alt="封面" className="w-full h-48 object-cover" />
                  <button onClick={() => updateField("coverImage", "")} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button onClick={() => coverInputRef.current?.click()} disabled={isUploadingCover}
                  className="w-full h-48 rounded-xl border-2 border-dashed border-border bg-white flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-amber-300 hover:text-amber-600 transition-colors">
                  {isUploadingCover ? <Loader2 className="h-6 w-6 animate-spin" /> : <><ImagePlus className="h-8 w-8" /><span className="text-sm">点击上传封面图</span><span className="text-xs">JPG/PNG，≤2MB</span></>}
                </button>
              )}
              <input ref={coverInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }} />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">关联地点</label>
              {form.locationName ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                  <MapPin className="h-4 w-4 text-amber-500" /><span className="flex-1 text-sm">{form.locationName}</span>
                  <button onClick={() => { updateField("locationId", ""); updateField("locationName", ""); }} className="text-muted-foreground hover:text-red-500"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" value={locationSearch} onChange={(e) => handleLocationSearch(e.target.value)}
                    placeholder="搜索地点..." className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400" />
                  {isSearchingLocation && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                  {locationResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-white shadow-lg overflow-hidden">
                      {locationResults.map((loc) => (
                        <button key={loc.id} type="button"
                          onClick={() => { updateField("locationId", loc.id); updateField("locationName", loc.name); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-amber-50 transition-colors">
                          <MapPin className="h-3.5 w-3.5 text-amber-500" />{loc.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">标签</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const selected = form.tags.includes(tag.name);
                  return (
                    <button key={tag.id} type="button"
                      onClick={() => { updateField("tags", selected ? form.tags.filter((t) => t !== tag.name) : [...form.tags, tag.name].slice(0, 10)); }}
                      className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", selected ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200")}>
                      {tag.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{form.tags.length}/10 最多</p>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="hidden lg:block">
            <div className="sticky top-20 rounded-xl border border-border/60 bg-white p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">预览</h3>
              {form.content ? (
                <div className="prose prose-sm max-w-none"><MarkdownContent content={form.content} /></div>
              ) : (
                <p className="text-sm text-muted-foreground italic">输入内容后将在右侧实时预览</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
