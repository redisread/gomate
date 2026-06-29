"use client";

import * as React from "react";
import { Link2, X, Download, Loader2, Share2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useToast } from "@/hooks/useToast";
import { StoryToast } from "./story-detail-toast";

interface StoryPosterPreviewProps {
  open: boolean;
  storyId: string;
  storyTitle: string;
  onClose: () => void;
}

export function StoryPosterPreview({ open, storyId, storyTitle, onClose }: StoryPosterPreviewProps) {
  const { t } = useI18n(["teams", "common"]);
  const { toast, show: showToast, isExiting } = useToast();
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const storyUrl = typeof window !== "undefined" ? `${window.location.origin}/discover/${storyId}` : "";

  React.useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    setHasError(false);
    setImageUrl(null);
    fetch(`/share-image/story/${storyId}`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.blob(); })
      .then((blob) => { setImageUrl(URL.createObjectURL(blob)); setIsLoading(false); })
      .catch(() => { setHasError(true); setIsLoading(false); showToast({ type: "error", message: "海报生成失败，已复制链接" }); navigator.clipboard.writeText(storyUrl).catch(() => {}); });
  }, [open, storyId, storyUrl, showToast]);

  const handleDownload = async () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `story-${storyId}.png`;
    a.click();
  };

  const handleShare = async () => {
    try { await navigator.share({ title: storyTitle, url: storyUrl }); } catch { /* ignore */ }
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <StoryToast toast={toast} exiting={isExiting} />
      <div className="fixed inset-0 bg-black/40 z-50 transition-opacity" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-background z-50 rounded-t-2xl max-h-[90vh] overflow-auto" style={{ paddingBottom: "env(safe-area-inset-bottom)", animation: "slideUp 0.2s ease" }}>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{t("teams.shareOptions")}</span>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          )}

          {hasError && (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">海报生成失败</p>
              <div className="flex justify-center gap-3">
                <button onClick={handleShare} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity">
                  <Share2 className="h-4 w-4 inline mr-1" />{t("common.share")}
                </button>
                <button onClick={() => { navigator.clipboard.writeText(storyUrl); showToast({ type: "success", message: "链接已复制" }); }} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors">
                  <Link2 className="h-4 w-4 inline mr-1" />{t("teams.copyLink")}
                </button>
              </div>
            </div>
          )}

          {imageUrl && !isLoading && (
            <div className="space-y-3">
              <img src={imageUrl} alt={storyTitle} className="w-full rounded-xl border border-border" />
              <div className="flex gap-3 justify-center">
                <button onClick={handleDownload} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors">
                  <Download className="h-4 w-4" />{t("teams.downloadQRCode")}
                </button>
                <button onClick={handleShare} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors">
                  <Share2 className="h-4 w-4" />{t("common.share")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
