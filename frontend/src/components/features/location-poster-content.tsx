"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { copy } from "@/lib/copy";

interface LocationPosterContentProps {
  title: string;
  subtitle?: string;
  url: string;
  coverImageDataUrl?: string | null;
  description?: string;
  tags?: string[];
  meta?: string;
}

export function LocationPosterContent({
  title,
  subtitle,
  url,
  coverImageDataUrl,
  description,
  tags,
  meta,
}: LocationPosterContentProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: { dark: "#ffffff", light: "#00000000" },
    }).then(setQrDataUrl);
  }, [url]);

  return (
    <div
      className="relative flex w-full flex-col overflow-hidden"
      style={{
        fontFamily: "'Zpix', monospace",
        background:
          "linear-gradient(145deg, #0a0a1a 0%, #1a0a2e 40%, #0d1530 70%, #0a0a1a 100%)",
      }}
    >
      {/* ── Top neon gradient line ── */}
      <div
        className="h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #06b6d4 20%, #a855f7 50%, #ec4899 80%, transparent 100%)",
        }}
      />

      {/* ── Cover image (clean, no overlay) ── */}
      {coverImageDataUrl && (
        <div className="mx-4 mt-4 overflow-hidden rounded-lg">
          <img
            src={coverImageDataUrl}
            alt=""
            className="block h-44 w-full object-cover"
          />
        </div>
      )}

      {/* ── Content area ── */}
      <div className="flex flex-1 flex-col px-4 pt-4 pb-4">
        {/* Glass card */}
        <div
          className="flex flex-1 flex-col rounded-xl px-5 pt-5 pb-5"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Title */}
          <h2
            className="text-[16px] leading-[24px] text-white line-clamp-2"
            style={{
              textShadow:
                "0 0 20px rgba(6,182,212,0.5), 0 0 40px rgba(168,85,247,0.2)",
            }}
          >
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1.5 text-[12px] leading-[18px] text-white/50">
              {subtitle}
            </p>
          )}

          {description && (
            <p className="mt-3 text-[12px] leading-[18px] text-white/60 line-clamp-2">
              {description}
            </p>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2.5 py-0.5 text-[10px] leading-[16px] text-cyan-300/90"
                  style={{
                    background: "rgba(6,182,212,0.1)",
                    border: "1px solid rgba(6,182,212,0.25)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Address */}
          {meta && (
            <p className="mt-3 text-[12px] leading-[16px] text-white/40">
              📍 {meta}
            </p>
          )}

          {/* Divider */}
          <div
            className="mt-4 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
            }}
          />

          {/* QR Code */}
          <div className="mt-4 flex items-center gap-4">
            {qrDataUrl && (
              <div
                className="shrink-0 rounded-lg p-2"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="h-[72px] w-[72px]"
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span
                className="text-[12px] leading-[16px] text-white/50"
                style={{ textShadow: "0 0 8px rgba(6,182,212,0.3)" }}
              >
                {copy.share.scanToViewLocation}
              </span>
              <span className="text-[10px] text-white/25">gomate.live</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom neon gradient line ── */}
      <div
        className="h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #ec4899 20%, #a855f7 50%, #06b6d4 80%, transparent 100%)",
        }}
      />
    </div>
  );
}
