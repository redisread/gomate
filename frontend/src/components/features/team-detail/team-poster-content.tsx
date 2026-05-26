"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Mountain } from "lucide-react";

const ZPIX_FONT_URL =
  "https://cdn.jsdelivr.net/gh/SolidZORO/zpix-pixel-font@master/website/zpix.woff2";

interface TeamPosterContentProps {
  title: string;
  date: string;
  locationName?: string;
  url: string;
  qrHint: string;
  footerText: string;
}

export function TeamPosterContent({
  title,
  date,
  locationName,
  url,
  qrHint,
  footerText,
}: TeamPosterContentProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 180,
      margin: 2,
      color: { dark: "#1c1917", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [url]);

  return (
    <div
      className="flex w-[340px] flex-col bg-white rounded-2xl overflow-hidden shadow-lg"
      style={{ fontFamily: "'Zpix', system-ui, sans-serif" }}
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

      {/* Header - GoMate Logo */}
      <div className="flex items-center justify-center py-4 bg-gradient-to-r from-amber-500 to-amber-600">
        <div className="flex items-center gap-2 text-white">
          <Mountain className="w-5 h-5" />
          <span className="text-sm font-semibold tracking-wide">GoMate</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col px-6 py-5">
        {/* Title */}
        <h2
          className="text-lg leading-tight text-stone-900 mb-4"
          style={{ fontFamily: "'Zpix', monospace" }}
        >
          {title}
        </h2>

        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-stone-600 mb-2">
          <span className="text-amber-600">📅</span>
          <span>{date}</span>
        </div>

        {/* Location */}
        {locationName && (
          <div className="flex items-center gap-2 text-sm text-stone-600 mb-4">
            <span className="text-amber-600">📍</span>
            <span>{locationName}</span>
          </div>
        )}

        {/* Divider */}
        <div className="w-full h-px bg-stone-200 my-4" />

        {/* QR Code */}
        <div className="flex flex-col items-center">
          {qrDataUrl && (
            <div className="rounded-xl bg-white p-3 shadow-md border border-stone-100">
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-32 h-32"
              />
            </div>
          )}
          <p className="mt-3 text-xs text-stone-500">
            {qrHint}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="py-3 bg-stone-50 border-t border-stone-100">
        <p className="text-center text-xs text-stone-400">
          {footerText}
        </p>
      </div>
    </div>
  );
}
