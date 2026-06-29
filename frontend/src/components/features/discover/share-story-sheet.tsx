"use client";

import * as React from "react";
import { ImagePlus, Link2, Mail, MessageCircle, Share2, Twitter, X, Smartphone } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI } from "@/lib/api";
import { weiboShareUrl, twitterShareUrl, mailtoUrl } from "@/lib/share-channels";


async function trackShare(storyId: string, channel: string) {
  try {
    await fetchAPI("/api/shares/track", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type: "story", entity_id: storyId, share_channel: channel }),
    });
  } catch { /* don't block share flow */ }
}

interface ShareStorySheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  storyId: string;
  summary: string;
  onCopyLink: () => void;
}

export function ShareStorySheet({ open, onClose, title, storyId, summary, onCopyLink }: ShareStorySheetProps) {
  const { t } = useI18n(["common", "teams", "share"]);
  const url = typeof window !== "undefined" ? window.location.href : "";

  if (!open) return null;

  const handleCopyLink = () => { trackShare(storyId, "copy"); onCopyLink(); onClose(); };
  const handleSystemShare = async () => {
    try { await navigator.share({ title, url }); } catch (err) { if (err instanceof DOMException && err.name === "AbortError") return; }
    trackShare(storyId, "native"); onClose();
  };
  const handleWeibo = () => { trackShare(storyId, "weibo"); window.open(weiboShareUrl(url, title), "_blank"); onClose(); };
  const handleTwitter = () => { trackShare(storyId, "twitter"); window.open(twitterShareUrl(url, title), "_blank"); onClose(); };
  const handleEmail = () => { window.location.href = mailtoUrl(title, `${title}\n\n${summary}\n\n${url}`); onClose(); };
  const handleWechat = async () => { trackShare(storyId, "wechat");
    try {
      const res = await fetch(`/share-image/story/${storyId}`);
      if (!res.ok) { window.open(url, "_blank"); onClose(); return; }
      const blob = await res.blob();
      const file = new File([blob], "story.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, url });
      } else {
        window.open(url, "_blank");
      }
    } catch { window.open(url, "_blank"); }
    onClose();
  };
  const handlePoster = () => { window.open(`/share-image/story/${storyId}`, "_blank"); onClose(); };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 transition-opacity" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-background z-50 rounded-t-2xl" style={{ paddingBottom: "env(safe-area-inset-bottom)", animation: "slideUp 0.2s ease" }}>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{t("teams.shareOptions")}</span>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <p className="text-sm font-medium text-foreground truncate">{title}</p>

          <div className="grid grid-cols-4 gap-4 py-4">
            <button onClick={handleCopyLink} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center"><Link2 className="w-5 h-5 text-amber-600" /></div>
              <span className="text-xs text-muted-foreground">{t("teams.copyLink")}</span>
            </button>
            <button onClick={handleSystemShare} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center"><Share2 className="w-5 h-5 text-blue-600" /></div>
              <span className="text-xs text-muted-foreground">{t("common.share")}</span>
            </button>
            <button onClick={handleWeibo} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center"><MessageCircle className="w-5 h-5 text-red-500" /></div>
              <span className="text-xs text-muted-foreground">{t("share.weibo")}</span>
            </button>
            <button onClick={handleTwitter} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center"><Twitter className="w-5 h-5 text-sky-500" /></div>
              <span className="text-xs text-muted-foreground">{t("share.twitter")}</span>
            </button>
            <button onClick={handleEmail} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center"><Mail className="w-5 h-5 text-stone-600" /></div>
              <span className="text-xs text-muted-foreground">{t("share.email")}</span>
            </button>
            <button onClick={handleWechat} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center"><Smartphone className="w-5 h-5 text-green-600" /></div>
              <span className="text-xs text-muted-foreground">{t("share.wechat")}</span>
            </button>
            <button onClick={handlePoster} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center"><ImagePlus className="w-5 h-5 text-purple-600" /></div>
              <span className="text-xs text-muted-foreground">{t("teams.generatePoster")}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
