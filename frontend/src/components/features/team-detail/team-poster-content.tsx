"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { MapPin, Calendar, Users, Mountain } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface TeamPosterContentProps {
  title: string;
  date: string;
  locationName?: string;
  coverImage?: string;
  url: string;
  currentMembers?: number;
  maxMembers?: number;
  leaderName?: string;
  leaderAvatar?: string | null;
}

export function TeamPosterContent({
  title,
  date,
  locationName,
  coverImage,
  url,
  currentMembers = 1,
  maxMembers = 5,
  leaderName,
  leaderAvatar,
}: TeamPosterContentProps) {
  const { t } = useI18n(["teams"]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [coverError, setCoverError] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 200,
      margin: 2,
      color: { dark: "#92400E", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [url]);

  // Calculate progress
  const progress = Math.min((currentMembers / maxMembers) * 100, 100);
  const remaining = maxMembers - currentMembers;

  return (
    <div
      className="flex w-[375px] flex-col bg-white overflow-hidden"
      style={{
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Cover Image Section */}
      <div className="relative w-full h-[220px] overflow-hidden">
        {coverImage && !coverError ? (
          <img
            src={coverImage}
            alt={locationName || "Location"}
            className="w-full h-full object-cover"
            onError={() => setCoverError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Mountain className="w-16 h-16 text-white/60" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Status badge */}
        <div className="absolute top-4 left-4">
          <div
            className="px-3 py-1.5 rounded-full text-xs font-semibold text-white backdrop-blur-md"
            style={{
              background: "rgba(217, 119, 6, 0.85)",
            }}
          >
            {remaining > 0
              ? t("teams.posterSpotsLeft", { count: remaining })
              : t("teams.posterAlmostFull")}
          </div>
        </div>

        {/* GoMate Logo */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 text-white">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(255, 255, 255, 0.2)" }}
          >
            <Mountain className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold">GoMate</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative flex flex-col px-6 pt-6 pb-8">
        {/* Decorative background */}
        <div
          className="absolute top-0 left-0 right-0 h-32 -z-10"
          style={{
            background: "linear-gradient(180deg, #FEF3C7 0%, #ffffff 100%)",
          }}
        />

        {/* Title */}
        <h1
          className="text-xl font-bold text-stone-900 mb-4 leading-snug"
          style={{ lineHeight: "1.4" }}
        >
          {title}
        </h1>

        {/* Info Cards */}
        <div className="space-y-3 mb-5">
          {/* Date */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/80">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(217, 119, 6, 0.15)" }}
            >
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-stone-500">{t("teams.posterDateLabel")}</p>
              <p className="text-sm font-semibold text-stone-800">{date}</p>
            </div>
          </div>

          {/* Location */}
          {locationName && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50/80">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(120, 113, 108, 0.1)" }}
              >
                <MapPin className="w-4 h-4 text-stone-600" />
              </div>
              <div>
                <p className="text-xs text-stone-500">{t("teams.posterLocationLabel")}</p>
                <p className="text-sm font-semibold text-stone-800">{locationName}</p>
              </div>
            </div>
          )}

          {/* Members */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/80">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(16, 185, 129, 0.15)" }}
            >
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-stone-500">{t("teams.posterMembersLabel")}</p>
              <p className="text-sm font-semibold text-stone-800">
                {t("teams.posterMemberCount", { current: currentMembers, max: maxMembers })}
              </p>
            </div>
            {/* Progress bar */}
            <div className="w-16 h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Leader */}
        {leaderName && (
          <div className="flex items-center gap-3 mb-5 p-3 rounded-xl border border-stone-100">
            {leaderAvatar ? (
              <img
                src={leaderAvatar}
                alt={leaderName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{
                  background: "linear-gradient(135deg, #D97706 0%, #FCD34D 100%)",
                }}
              >
                {leaderName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs text-stone-500">{t("teams.posterLeaderLabel")}</p>
              <p className="text-sm font-semibold text-stone-800">{leaderName}</p>
            </div>
          </div>
        )}

        {/* Divider with decorative dots */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex-1 h-px bg-stone-200" />
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          </div>
          <div className="flex-1 h-px bg-stone-200" />
        </div>

        {/* QR Code Section */}
        <div className="flex flex-col items-center">
          {/* QR Container with shadow */}
          <div
            className="rounded-2xl bg-white p-4 shadow-lg border border-stone-100"
            style={{
              boxShadow: "0 10px 40px -10px rgba(217, 119, 6, 0.2)",
            }}
          >
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-36 h-36"
              />
            )}
          </div>

          {/* QR Hint */}
          <div className="mt-4 text-center">
            <p className="text-base font-semibold text-amber-700 mb-1">
              {t("teams.posterQrHint")}
            </p>
            <p className="text-xs text-stone-400">
              {t("teams.posterFooter")}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom decorative pattern */}
      <div className="relative h-16 overflow-hidden">
        <svg
          className="absolute bottom-0 w-full"
          viewBox="0 0 375 60"
          preserveAspectRatio="none"
        >
          <path
            d="M0,60 L0,40 Q93.75,20 187.5,40 Q281.25,60 375,40 L375,60 Z"
            fill="#FEF3C7"
            opacity="0.5"
          />
          <path
            d="M0,60 L0,50 Q93.75,30 187.5,50 Q281.25,70 375,50 L375,60 Z"
            fill="#FDE68A"
            opacity="0.3"
          />
        </svg>
      </div>
    </div>
  );
}
