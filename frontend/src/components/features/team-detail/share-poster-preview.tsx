"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import { useI18n } from "@/hooks/useI18n";
import { Link2, X, CheckCircle, Download, Loader2 } from "lucide-react";
import { TeamPosterContent } from "./team-poster-content";

interface SharePosterPreviewProps {
  open: boolean;
  teamTitle: string;
  teamDate: string;
  teamLocation?: string;
  teamUrl: string;
  onClose: () => void;
}

export function SharePosterPreview({
  open,
  teamTitle,
  teamDate,
  teamLocation,
  teamUrl,
  onClose,
}: SharePosterPreviewProps) {
  const { t } = useI18n(["teams", "common"]);
  const [copied, setCopied] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [posterDataUrl, setPosterDataUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const posterRef = React.useRef<HTMLDivElement>(null);

  // Generate poster image when opened
  React.useEffect(() => {
    if (!open || posterDataUrl) return;

    const generatePoster = async () => {
      if (!posterRef.current) return;

      setIsGenerating(true);
      setError(null);

      try {
        // Wait for fonts and images to load
        await new Promise(resolve => setTimeout(resolve, 500));

        const dataUrl = await toPng(posterRef.current, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: '#ffffff',
        });

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
          className="bg-card rounded-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">
              {t("teams.shareTeam")}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Poster Preview */}
          <div className="p-4 flex flex-col items-center">
            {/* Hidden poster for generation */}
            <div
              ref={posterRef}
              className="absolute -left-[9999px] top-0"
              style={{ position: 'fixed', left: '-9999px' }}
            >
              <TeamPosterContent
                title={teamTitle}
                date={teamDate}
                locationName={teamLocation}
                url={teamUrl}
                qrHint={t("teams.qrCodeHint")}
                footerText={t("teams.posterFooter")}
              />
            </div>

            {/* Display generated poster */}
            {isGenerating ? (
              <div className="w-[340px] h-[480px] bg-muted rounded-xl flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t("teams.generatingPoster")}
                </p>
              </div>
            ) : posterDataUrl ? (
              <img
                src={posterDataUrl}
                alt="Team Poster"
                className="w-[340px] rounded-xl shadow-lg"
              />
            ) : error ? (
              <div className="w-[340px] h-[480px] bg-muted rounded-xl flex flex-col items-center justify-center p-6">
                <p className="text-sm text-red-500 mb-2">{error}</p>
                <p className="text-xs text-muted-foreground">
                  {t("teams.posterGenerateFallback")}
                </p>
              </div>
            ) : null}

            {/* Hint */}
            <p className="mt-3 text-xs text-center text-muted-foreground">
              {t("teams.saveImageHint")}
            </p>
          </div>

          {/* Actions */}
          <div className="p-4 space-y-3 border-t border-border">
            {/* Save Image - Primary */}
            <button
              onClick={handleSaveImage}
              disabled={!posterDataUrl}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
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
