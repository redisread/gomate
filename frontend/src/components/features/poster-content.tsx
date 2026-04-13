"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useI18n } from "@/hooks/useI18n";

const ZPIX_FONT_URL =
  "https://cdn.jsdelivr.net/gh/SolidZORO/zpix-pixel-font@master/website/zpix.woff2";

interface PosterContentProps {
  type: "team" | "location";
  title: string;
  subtitle?: string;
  url: string;
  coverImageDataUrl?: string | null;
  locationName?: string;
  description?: string;
  leaderName?: string;
  membersInfo?: string;
  tags?: string[];
  meta?: string;
}

export function PosterContent({
  type,
  title,
  subtitle,
  url,
  coverImageDataUrl,
  locationName,
  description,
  leaderName,
  membersInfo,
  tags,
  meta,
}: PosterContentProps) {
  const { t } = useI18n(["share"]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: { dark: "#1c1917", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [url]);

  const scanText =
    type === "team" ? t('share.scanToJoin') : t('share.scanToViewLocation');

  return (
    <div
      className="flex w-full flex-col bg-white"
      style={{ fontFamily: "'Zpix', monospace" }}
    >
      <style>{`
        @font-face {
          font-family: 'Zpix';
          src: url('${ZPIX_FONT_URL}') format('woff2');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `}</style>
      {/* Cover area */}
      <div className="relative h-40 overflow-hidden">
        {coverImageDataUrl ? (
          <>
            <img
              src={coverImageDataUrl}
              alt=""
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </>
        ) : (
          <div
            className={`h-full w-full ${
              type === "team"
                ? "bg-gradient-to-r from-amber-500 to-amber-600"
                : "bg-gradient-to-r from-stone-500 to-stone-600"
            }`}
          />
        )}
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col px-5 pt-5 pb-4">
        {locationName && (
          <p className="mb-2 text-[12px] leading-[16px] text-stone-500">
            📍 {locationName}
          </p>
        )}

        <h2 className="text-[16px] leading-[22px] text-stone-900 line-clamp-2">
          {title}
        </h2>

        {description && (
          <p className="mt-2 text-[12px] leading-[18px] text-stone-500 line-clamp-2">
            {description}
          </p>
        )}

        {(leaderName || membersInfo) && (
          <p className="mt-2 text-[12px] leading-[16px] text-stone-600">
            {[
              leaderName && `👤 ${leaderName}`,
              membersInfo && `👥 ${membersInfo}`,
            ]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
        )}

        {tags && tags.length > 0 && (
          <p className="mt-1.5 text-[12px] leading-[16px] text-stone-400">
            🏷️ {tags.slice(0, 4).join(" | ")}
          </p>
        )}

        {subtitle && (
          <p className="mt-1.5 text-[12px] leading-[16px] text-stone-400">
            {subtitle}
          </p>
        )}

        {meta && (
          <p className="mt-1.5 text-[12px] leading-[16px] text-stone-400">
            {meta}
          </p>
        )}

        {/* QR Code */}
        <div className="mt-auto flex flex-col items-center pt-5">
          {qrDataUrl && (
            <div className="rounded-lg bg-white p-2 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <img src={qrDataUrl} alt="QR Code" className="h-[100px] w-[100px]" />
            </div>
          )}
          <p className="mt-2.5 text-[12px] leading-[16px] text-stone-500">
            {scanText}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-4 border-t border-stone-200 pt-3">
          <p className="text-center text-[12px] leading-[16px] text-stone-400">
            gomate.live
          </p>
        </div>
      </div>
    </div>
  );
}
