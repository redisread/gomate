"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useI18n } from "@/hooks/useI18n";

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
  const { t } = useI18n(["share"]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: { dark: "#1e1812", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [url]);

  return (
    <div
      className="relative flex w-full flex-col overflow-hidden"
      style={{
        fontFamily: "'Zpix', monospace",
        background: "#faf8f5",
      }}
    >
      {/* ── Cover image ── */}
      {coverImageDataUrl && (
        <div className="mx-4 mt-4 overflow-hidden rounded-xl">
          <img
            src={coverImageDataUrl}
            alt=""
            className="block h-44 w-full object-cover"
          />
        </div>
      )}

      {/* ── Content card ── */}
      <div className="flex flex-1 flex-col px-4 pt-4 pb-4">
        <div
          className="flex flex-1 flex-col rounded-xl px-5 pt-5 pb-5"
          style={{
            background: "rgba(255, 255, 255, 0.85)",
            border: "1px solid #e8e0d7",
            boxShadow:
              "0 2px 8px rgba(30, 24, 18, 0.06), 0 1px 2px rgba(30, 24, 18, 0.04)",
          }}
        >
          {/* Title */}
          <h2 className="text-[16px] leading-[24px] text-[#1e1812] line-clamp-2">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1.5 text-[12px] leading-[18px] text-[#8f7f6e]">
              {subtitle}
            </p>
          )}

          {description && (
            <p className="mt-3 text-[12px] leading-[18px] text-[#8f7f6e] line-clamp-2">
              {description}
            </p>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2.5 py-0.5 text-[10px] leading-[16px] text-[#92400E]"
                  style={{
                    background: "#FFFBEB",
                    border: "1px solid #FCD34D",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Address */}
          {meta && (
            <p className="mt-3 text-[12px] leading-[16px] text-[#8f7f6e]">
              📍 {meta}
            </p>
          )}

          {/* Divider */}
          <div
            className="mt-4 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, #e8e0d7, transparent)",
            }}
          />

          {/* QR Code */}
          <div className="mt-4 flex items-center gap-4">
            {qrDataUrl && (
              <div
                className="shrink-0 rounded-lg p-2"
                style={{
                  background: "#ffffff",
                  border: "1px solid #e8e0d7",
                  boxShadow: "0 2px 8px rgba(30, 24, 18, 0.06)",
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
              <span className="text-[12px] leading-[16px] text-[#1e1812]">
                {t('share.scanToViewLocation')}
              </span>
              <span
                className="text-[10px]"
                style={{
                  background:
                    "linear-gradient(135deg, #D97706, #F59E0B, #FCD34D)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                gomate.live
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
