"use client";

import { MapPin, Pencil } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { Location } from "@/lib/types";

interface LocationDetailHeaderProps {
  location: Location;
  isAdmin: boolean;
  heroDifficulty?: string;
  diffInfo: {
    label: string;
    dot: string;
    text: string;
    pill: string;
  };
}

export function LocationDetailHeader({
  location,
  isAdmin,
  heroDifficulty,
  diffInfo,
}: LocationDetailHeaderProps) {
  const { t } = useI18n(["locationDetail", "common"]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="flex-1">
        {/* 标题 */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {location.name}
            </h1>
            {location.subtitle && (
              <p className="text-sm text-muted-foreground">
                {location.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* 难度标签 */}
        {heroDifficulty && (
          <div className="flex items-center gap-2 ml-[52px]">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${diffInfo.pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${diffInfo.dot}`} />
              {diffInfo.label}
            </span>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        {isAdmin && (
          <a
            href={`/locations/${location.slug}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            <Pencil className="w-4 h-4" />
            {t("common.edit")}
          </a>
        )}
      </div>
    </div>
  );
}
