"use client";

import * as React from "react";
import { Link2, Share2, X } from "lucide-react";

interface ShareStorySheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  onCopyLink: () => void;
}

export function ShareStorySheet({ open, onClose, title, onCopyLink }: ShareStorySheetProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 transition-opacity" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-background z-50 rounded-t-2xl" style={{ paddingBottom: "env(safe-area-inset-bottom)", animation: "slideUp 0.2s ease" }}>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">分享故事</span>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <p className="text-sm font-medium text-foreground truncate">{title}</p>

          <div className="grid grid-cols-4 gap-4 py-4">
            <button onClick={onCopyLink} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center"><Link2 className="w-5 h-5 text-amber-600" /></div>
              <span className="text-xs text-muted-foreground">复制链接</span>
            </button>
            <button onClick={() => { if (navigator.share) navigator.share({ title, url: window.location.href }); }} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center"><Share2 className="w-5 h-5 text-blue-600" /></div>
              <span className="text-xs text-muted-foreground">更多</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
