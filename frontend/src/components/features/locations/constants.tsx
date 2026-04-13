import { Footprints, Coffee, Plane, Compass } from "lucide-react";
import type { TranslationKey } from "@/i18n";

// ─── 标签颜色配置 ─────────────────────────────────────────────────────────────
export const tagColorClasses = [
  "bg-emerald-50 text-emerald-700 border-emerald-100",
  "bg-amber-50 text-amber-700 border-amber-100",
  "bg-sky-50 text-sky-700 border-sky-100",
];

// ─── 角色配置 ─────────────────────────────────────────────────────────────
export type RoleKey = "hiking" | "explore" | "leisure" | "travel" | "";

export interface RoleCfg {
  icon: React.ElementType;
  label: string;
  desc: string;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  iconColor: string;
  activeColor: string;
  activeBg: string;
}

/**
 * Build role config with translated labels
 */
export function getRoleConfig(t: (key: TranslationKey) => string): Record<Exclude<RoleKey, "">, RoleCfg> {
  return {
    hiking: {
      icon: Footprints,
      label: t("locations.roleHiking"),
      desc: t("locations.roleHikingDesc"),
      emoji: "🥾",
      gradientFrom: "rgba(22,163,74,0.07)",
      gradientTo: "rgba(16,185,129,0.05)",
      iconColor: "#16a34a",
      activeColor: "#15803d",
      activeBg: "linear-gradient(135deg, #16a34a, #059669)",
    },
    explore: {
      icon: Compass,
      label: t("locations.roleExplore"),
      desc: t("locations.roleExploreDesc"),
      emoji: "🗺️",
      gradientFrom: "rgba(14,165,233,0.07)",
      gradientTo: "rgba(99,102,241,0.05)",
      iconColor: "#0284c7",
      activeColor: "#0369a1",
      activeBg: "linear-gradient(135deg, #0284c7, #6366f1)",
    },
    leisure: {
      icon: Coffee,
      label: t("locations.roleLeisure"),
      desc: t("locations.roleLeisureDesc"),
      emoji: "☕",
      gradientFrom: "rgba(180,83,9,0.07)",
      gradientTo: "rgba(217,119,6,0.05)",
      iconColor: "#b45309",
      activeColor: "#92400e",
      activeBg: "linear-gradient(135deg, #b45309, #d97706)",
    },
    travel: {
      icon: Plane,
      label: t("locations.roleTravel"),
      desc: t("locations.roleTravelDesc"),
      emoji: "✈️",
      gradientFrom: "rgba(139,92,246,0.07)",
      gradientTo: "rgba(236,72,153,0.05)",
      iconColor: "#7c3aed",
      activeColor: "#6d28d9",
      activeBg: "linear-gradient(135deg, #7c3aed, #db2777)",
    },
  };
}
