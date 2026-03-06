"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Mountain,
  Eye,
  Droplets,
  Coffee,
  Navigation,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PoiCategory } from "@/lib/poi-types";

interface CheckpointPoi {
  id: string;
  name: string;
  description: string | null;
  category: PoiCategory;
  coordinates: { lat: number; lng: number };
  images: string[];
  extra: { elevation?: number; isPopular?: boolean; [key: string]: any } | null;
  order: number | null;
  roleType: string;
}

interface LocationCheckpointsProps {
  locationId: string;
  className?: string;
}

const categoryIconMap: Record<PoiCategory, React.ElementType> = {
  mountain_peak: Mountain,
  viewpoint: Eye,
  checkpoint: MapPin,
  waterfall: Droplets,
  rest_area: Coffee,
  trail_marker: Navigation,
  parking: MapPin,
  restroom: MapPin,
  restaurant: Coffee,
  store: MapPin,
  other: MapPin,
};

// 每个 category 对应的配色（浅色背景 + 深色图标，与整体大地色体系统一）
const categoryStyle: Record<PoiCategory, { bg: string; icon: string }> = {
  mountain_peak: { bg: "bg-orange-50",  icon: "text-orange-600" },
  viewpoint:     { bg: "bg-sky-50",     icon: "text-sky-600" },
  checkpoint:    { bg: "bg-emerald-50", icon: "text-emerald-600" },
  waterfall:     { bg: "bg-cyan-50",    icon: "text-cyan-600" },
  rest_area:     { bg: "bg-amber-50",   icon: "text-amber-600" },
  trail_marker:  { bg: "bg-violet-50",  icon: "text-violet-600" },
  parking:       { bg: "bg-slate-50",   icon: "text-slate-500" },
  restroom:      { bg: "bg-teal-50",    icon: "text-teal-600" },
  restaurant:    { bg: "bg-rose-50",    icon: "text-rose-600" },
  store:         { bg: "bg-lime-50",    icon: "text-lime-600" },
  other:         { bg: "bg-stone-100",  icon: "text-stone-500" },
};

// 横向卡片子组件
function CheckpointCard({
  poi,
  index,
}: {
  poi: CheckpointPoi;
  index: number;
}) {
  const CategoryIcon = categoryIconMap[poi.category] ?? MapPin;
  const style = categoryStyle[poi.category] ?? { bg: "bg-stone-100", icon: "text-stone-500" };
  const elevation = poi.extra?.elevation;
  const isPopular = poi.extra?.isPopular;

  return (
    <motion.div
      className="flex-none w-36 rounded-2xl overflow-hidden shadow-sm border border-stone-100 cursor-pointer snap-start"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20,
        delay: index * 0.06,
      }}
      whileHover={{ y: -4, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
    >
      {/* 顶部配色区 */}
      <div className={cn("relative h-20 flex items-center justify-center", style.bg)}>
        <CategoryIcon className={cn("w-8 h-8", style.icon)} />
        {isPopular && (
          <div className="absolute top-1.5 right-1.5 bg-red-500 rounded-full p-0.5 shadow-sm">
            <Flame className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      {/* 底部信息区 */}
      <div className="p-3 bg-white">
        <p className="text-sm font-semibold text-stone-800 leading-tight">{poi.name}</p>
        {elevation != null && (
          <p className="text-xs text-stone-400 mt-0.5">{elevation}m</p>
        )}
        {poi.description && (
          <p className="text-xs text-stone-500 mt-1 line-clamp-2">{poi.description}</p>
        )}
      </div>
    </motion.div>
  );
}

export function LocationCheckpoints({
  locationId,
  className,
}: LocationCheckpointsProps) {
  const [pois, setPois] = React.useState<CheckpointPoi[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchPois() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/locations/${locationId}/pois?roleType=checkpoint`
        );
        const data = (await res.json()) as {
          success: boolean;
          pois: CheckpointPoi[];
        };
        if (!cancelled && data.success) {
          setPois(data.pois);
        }
      } catch {
        // 静默失败，不展示组件
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPois();
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  // 加载完成且无数据时不渲染
  if (!loading && pois.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={cn(className)}
    >
      {/* 标题区域 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <span className="text-xl">🏔</span>
            核心打卡点
          </h3>
          {!loading && (
            <p className="text-xs text-stone-400 mt-0.5">{pois.length} 个地标</p>
          )}
        </div>
        {/* 数量指示点 */}
        {!loading && pois.length > 0 && (
          <div className="flex gap-1">
            {pois.map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-stone-300" />
            ))}
          </div>
        )}
      </div>

      {/* 横向滚动卡片流 */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none snap-x snap-mandatory">
        {loading ? (
          // 骨架屏：横向排列
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="flex-none w-36 rounded-2xl overflow-hidden animate-pulse snap-start">
              <div className="h-20 bg-stone-200" />
              <div className="p-3 space-y-2 bg-white">
                <div className="h-3 bg-stone-200 rounded w-3/4" />
                <div className="h-2 bg-stone-100 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : (
          pois.map((poi, index) => (
            <CheckpointCard key={poi.id} poi={poi} index={index} />
          ))
        )}
      </div>
    </motion.div>
  );
}
