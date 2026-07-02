import * as React from "react";
import {
  Navigation,
  Flag,
  Eye,
  Building2,
  Star,
} from "lucide-react";

// POI 类型图标映射
export const POI_ICON_MAP: Record<string, React.ReactNode> = {
  waypoint: <Navigation className="h-3.5 w-3.5" />,
  checkpoint: <Flag className="h-3.5 w-3.5" />,
  viewpoint: <Eye className="h-3.5 w-3.5" />,
  facility: <Building2 className="h-3.5 w-3.5" />,
  poi: <Star className="h-3.5 w-3.5" />,
};

export const POI_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  waypoint: { bg: "bg-sky-50 dark:bg-sky-950/30", text: "text-sky-700 dark:text-sky-400", border: "border-sky-100 dark:border-sky-900/50" },
  checkpoint: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-100 dark:border-amber-900/50" },
  viewpoint: { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-400", border: "border-violet-100 dark:border-violet-900/50" },
  facility: { bg: "bg-stone-50 dark:bg-stone-800", text: "text-stone-600 dark:text-stone-400", border: "border-stone-100 dark:border-stone-700" },
  poi: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-900/50" },
};
