"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import { useI18n } from "@/hooks/useI18n";
import { Link2, X, CheckCircle, Download, Loader2, Share2 } from "lucide-react";
import { TeamPosterContent } from "./team-poster-content";

interface SharePosterPreviewProps {
  open: boolean;
  teamTitle: string;
  teamDate: string;
  teamLocation?: string;
  teamCoverImage?: string;
  teamUrl: string;
  teamCurrentMembers?: number;
  teamMaxMembers?: number;
  teamLeaderName?: string;
  teamLeaderAvatar?: string | null;
  onClose: () => void;
}

export function SharePosterPreview({
  open,
  teamTitle,
  teamDate,
  teamLocation,
  teamCoverImage,
  teamUrl,
  teamCurrentMembers = 1,
  teamMaxMembers = 5,
  teamLeaderName,
  teamLeaderAvatar,
  onClose,
}: SharePosterPreviewProps) {
  const { t } = useI18n(["teams", "common"]);
  const [copied, setCopied] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [posterDataUrl, setPosterDataUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [processedCoverImage, setProcessedCoverImage] = React.useState<string | undefined>(undefined);
  const posterRef = React.useRef<HTMLDivElement>(null);

  // Pre-load and process cover image to avoid CORS issues
  React.useEffect(() => {
    if (!open || !teamCoverImage) {
      setProcessedCoverImage(undefined);
      return;
    }

    const loadImage = async () => {
      try {
        // Try to load image and convert to data URL to avoid CORS
        const response = await fetch(teamCoverImage);
        if (!response.ok) throw new Error('Image fetch failed');
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        setProcessedCoverImage(dataUrl);
      } catch (err) {
        console.warn('[Poster] Failed to preload cover image:', err);
        // Fallback: don't show cover image
        setProcessedCoverImage(undefined);
      }
    };

    loadImage();
  }, [open, teamCoverImage]);

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setPosterDataUrl(null);
      setError(null);
    }
  }, [open, teamTitle, teamDate, teamLocation, teamCoverImage, teamUrl]);

  // Generate poster image when opened
  React.useEffect(() => {
    if (!open || posterDataUrl) return;

    const generatePoster = async () => {
      if (!posterRef.current) return;

      setIsGenerating(true);
      setError(null);

      try {
        // Wait for fonts to load
        if (document.fonts) {
          await document.fonts.ready;
        }

        // Wait for images to load
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Additional delay for iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Ensure element is visible for capture - element is already off-screen
        // No need to toggle visibility, preventing screen flash
        await new Promise(resolve => requestAnimationFrame(resolve));

        const dataUrl = await toPng(posterRef.current, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: '#ffffff',
        });

        // Validate generated image
        if (!dataUrl || dataUrl.length < 1000) {
          throw new Error('Generated image is empty or too small');
        }

        setPosterDataUrl(dataUrl);
      } catch (err) {
        console.error("Failed to generate poster:", err);
        setError(t("teams.posterGenerateError"));
      } finally {
        setIsGenerating(false);
      }
    };

    generatePoster();
  }, [open, posterDataUrl, t]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(teamUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleSaveImage = async () => {
    if (!posterDataUrl) return;

    try {
      // iOS Safari special handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        // Open image in new tab for iOS (user can long press to save)
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>长按保存图片</title></head>
              <body style="margin:0;display:flex;justify-content:center;align-items:center;background:#000;">
                <img src="${posterDataUrl}" style="max-width:100%;max-height:100vh;" />
              </body>
            </html>
          `);
        }
      } else {
        // Standard download for Android/PC
        const link = document.createElement("a");
        link.href = posterDataUrl;
        link.download = `gomate-team-${Date.now()}.png`;
        link.click();
      }
    } catch (err) {
      console.error("Failed to save image:", err);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-card rounded-2xl max-w-[420px] w-full max-h-[90vh] overflow-y-auto shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-foreground">
                {t("teams.shareTeam")}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Poster Preview */}
          <div className="p-4 flex flex-col items-center bg-gradient-to-b from-amber-50/50 to-background">
            {/* Hidden poster for generation - off-screen to avoid flash */}
            <div
              ref={posterRef}
              className="absolute pointer-events-none"
              style={{
                position: 'absolute',
                left: '-9999px',
                top: '-9999px',
                opacity: 1,
                visibility: 'visible',
              }}
              aria-hidden="true"
            >
              <TeamPosterContent
                title={teamTitle}
                date={teamDate}
                locationName={teamLocation}
                coverImage={processedCoverImage}
                url={teamUrl}
                currentMembers={teamCurrentMembers}
                maxMembers={teamMaxMembers}
                leaderName={teamLeaderName}
                leaderAvatar={teamLeaderAvatar}
              />
            </div>

            {/* Display generated poster */}
            {isGenerating ? (
              <div className="w-[280px] h-[498px] bg-muted rounded-2xl flex flex-col items-center justify-center shadow-lg">
                <Loader2 className="w-10 h-10 animate-spin text-amber-600 mb-4" />
                <p className="text-sm text-muted-foreground">
                  {t("teams.generatingPoster")}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-2">
                  {t("teams.posterGeneratingDesc")}
                </p>
              </div>
            ) : posterDataUrl ? (
              <div className="relative">
                <img
                  src={posterDataUrl}
                  alt="Team Poster"
                  className="w-[280px] rounded-2xl shadow-2xl"
                />
                {/* Decorative corner */}
                <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              </div>
            ) : error ? (
              <div className="w-[280px] h-[498px] bg-muted rounded-2xl flex flex-col items-center justify-center p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                  <X className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-sm text-red-500 mb-2">{error}</p>
                <p className="text-xs text-muted-foreground">
                  {t("teams.posterGenerateFallback")}
                </p>
              </div>
            ) : null}

            {/* Hint */}
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                {t("teams.saveImageHint")}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 space-y-3 border-t border-border">
            {/* Save Image - Primary */}
            <button
              onClick={handleSaveImage}
              disabled={!posterDataUrl}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-amber-200/50"
            >
              <Download className="w-5 h-5" />
              {t("teams.saveToAlbum")}
            </button>

            {/* Copy Link - Secondary */}
            <button
              onClick={handleCopyLink}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                copied
                  ? "bg-green-100 text-green-700"
                  : "border border-border text-foreground hover:bg-muted"
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {t("teams.linkCopied")}
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  {t("teams.copyLink")}
                </>
              )}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-full py-3 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
            >
              {t("teams.close")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
