"use client";

/**
 * 地点详情页 - 主内容区左栏组件集合（极致优化版）
 *
 * 角色：视觉总监 + 信息架构师 + 移动端交互设计师
 *
 * 包含：
 * - LocationIntroCard：地点介绍（展开/收起、标签、图片画廊预览）
 * - RouteInfoCard：路线数据网格（大数字展示、难度进度条、装备清单）
 * - TeamListSection：队伍列表容器（空状态、列表）
 * - TeamCard：单个队伍卡片（日历日期、头像人数气泡、渐变进度条）
 * - AddressRow：地址展示行
 * - PoiSection：打卡点区块
 */

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  Mountain,
  Clock,
  Ruler,
  TrendingUp,
  CalendarDays,
  Users,
  ArrowRight,
  Backpack,
  AlertTriangle,
  MapPin,
  ImageIcon,
  Navigation,
  Flag,
  Eye,
  Building2,
  Star,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { Location, Team, Tag, RoutePoi } from "@/lib/types";
import { getLocationPois } from "@/lib/api";

// ─── 难度配置 ─────────────────────────────────────────────────────────────────
const DIFFICULTY_CONFIG: Record<
  string,
  {
    label: string;
    barColor: string;
    textColor: string;
    bgColor: string;
    percent: number;
    ringColor: string;
  }
> = {
  easy: {
    label: copy.enums.difficulty.easy,
    barColor: "bg-emerald-400",
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-50",
    percent: 25,
    ringColor: "ring-emerald-200",
  },
  moderate: {
    label: copy.enums.difficulty.moderate,
    barColor: "bg-amber-400",
    textColor: "text-amber-700",
    bgColor: "bg-amber-50",
    percent: 50,
    ringColor: "ring-amber-200",
  },
  hard: {
    label: copy.enums.difficulty.hard,
    barColor: "bg-orange-500",
    textColor: "text-orange-700",
    bgColor: "bg-orange-50",
    percent: 75,
    ringColor: "ring-orange-200",
  },
  expert: {
    label: copy.enums.difficulty.expert,
    barColor: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    percent: 100,
    ringColor: "ring-red-200",
  },
};

// POI 类型图标映射
const POI_ICON_MAP: Record<string, React.ReactNode> = {
  waypoint: <Navigation className="h-3.5 w-3.5" />,
  checkpoint: <Flag className="h-3.5 w-3.5" />,
  viewpoint: <Eye className="h-3.5 w-3.5" />,
  facility: <Building2 className="h-3.5 w-3.5" />,
  poi: <Star className="h-3.5 w-3.5" />,
};

const POI_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  waypoint: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-100" },
  checkpoint: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
  viewpoint: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-100" },
  facility: { bg: "bg-stone-50", text: "text-stone-600", border: "border-stone-100" },
  poi: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
};

// ─────────────────────────────────────────────────────────────────────────────
// LocationIntroCard
// ─────────────────────────────────────────────────────────────────────────────

interface LocationIntroCardProps {
  location: Location;
  actions?: React.ReactNode;
}

/**
 * 地点介绍卡片（极致优化版）
 * - 超过 4 行时截断，点击「展开全文」可查看完整描述
 * - 图片缩略图画廊行（可点击放大）
 * - 标签胶囊（分类色彩）
 */
export function LocationIntroCard({ location, actions }: LocationIntroCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [isOverflow, setIsOverflow] = React.useState(false);
  const descRef = React.useRef<HTMLParagraphElement>(null);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [lightboxActive, setLightboxActive] = React.useState(0);

  React.useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    setIsOverflow(el.scrollHeight > el.clientHeight + 2);
  }, [location.description]);

  const galleryImages = React.useMemo(() => {
    const all: string[] = [];
    if (location.coverImage) all.push(location.coverImage);
    if (location.images) {
      for (const img of location.images) {
        if (img && img !== location.coverImage) all.push(img);
      }
    }
    return all;
  }, [location.coverImage, location.images]);

  // 打开 Lightbox
  const openLightbox = (idx: number) => {
    setLightboxActive(idx);
    setLightboxIndex(idx);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>

      {/* 图片画廊预览行 + 操作按钮 */}
      {(galleryImages.length > 0 || actions) && (
        <div className="px-5 pt-5 pb-0">
          <div className="flex items-center gap-3 pb-1">
            <div className="flex gap-2 overflow-x-auto scrollbar-none flex-1">
            {galleryImages.slice(0, 6).map((img, idx) => (
              <button
                key={idx}
                onClick={() => openLightbox(idx)}
                className="relative flex-shrink-0 w-[88px] h-[66px] rounded-xl overflow-hidden bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 group"
                aria-label={`查看图片 ${idx + 1}`}
              >
                <img
                  src={img}
                  alt={`${location.name} 图片 ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-108"
                />
                {/* 悬停遮罩 */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200 rounded-xl" />
                {/* 最后一张「更多」遮罩 */}
                {idx === 5 && galleryImages.length > 6 && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center rounded-xl">
                    <span className="text-white text-xs font-bold flex flex-col items-center gap-0.5">
                      <ImageIcon className="h-4 w-4" />
                      +{galleryImages.length - 6}
                    </span>
                  </div>
                )}
              </button>
            ))}
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </div>
        </div>
      )}

      <div className="p-5">
        {/* 标题 */}
        <h2 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-amber-400 flex-shrink-0" />
          {copy.locations.locationIntro}
        </h2>

        {/* 描述（展开/收起）*/}
        <div className="relative">
          <p
            ref={descRef}
            className={cn(
              "text-sm text-stone-500 leading-[1.9] tracking-wide transition-all duration-300",
              !expanded && "line-clamp-4"
            )}
          >
            {location.description}
          </p>
          {/* 收起时底部渐变遮罩 */}
          {!expanded && isOverflow && (
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>

        {/* 展开/收起按钮 */}
        {isOverflow && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2.5 inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-semibold transition-colors"
          >
            {expanded ? (
              <>收起 <ChevronUp className="h-3.5 w-3.5" /></>
            ) : (
              <>展开全文 <ChevronDown className="h-3.5 w-3.5" /></>
            )}
          </button>
        )}

        {/* 标签区 */}
        {location.tags && location.tags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-stone-50 flex flex-wrap gap-1.5">
            {location.tags.map((tag: Tag, i: number) => (
              <span
                key={tag?.id ?? i}
                className="px-3 py-1 bg-stone-50 text-stone-600 rounded-full text-xs font-medium border border-stone-100 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-100 transition-colors duration-150 cursor-default select-none"
              >
                {typeof tag === "string" ? tag : tag?.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 内联 Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* 计数 */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/40 text-white/70 text-xs font-medium">
            {lightboxActive + 1} / {galleryImages.length}
          </div>
          {/* 左箭头 */}
          {galleryImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxActive((i) => (i - 1 + galleryImages.length) % galleryImages.length); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <img
            src={galleryImages[lightboxActive]}
            alt={`${location.name} 大图`}
            className="max-w-[90vw] max-h-[88vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {/* 右箭头 */}
          {galleryImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxActive((i) => (i + 1) % galleryImages.length); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          <p className="absolute bottom-6 text-white/50 text-xs">点击任意处关闭 · 方向键切换</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RouteInfoCard
// ─────────────────────────────────────────────────────────────────────────────

interface RouteInfoCardProps {
  location: Location;
}

/**
 * 路线信息卡片（极致优化版）
 * - 大数字 + 小单位展示核心数据
 * - 难度：彩色进度条 + 环形图标
 * - 最佳季节 + 装备建议 + 安全注意事项
 */
export function RouteInfoCard({ location }: RouteInfoCardProps) {
  const diffInfo = location.difficulty
    ? (DIFFICULTY_CONFIG[location.difficulty] ?? DIFFICULTY_CONFIG.easy)
    : null;

  const routeData = {
    duration: location.duration ?? location.routes?.[0]?.duration,
    distance: (location as any).distance ?? location.routes?.[0]?.distance,
    elevation: (location as any).elevation ?? location.routes?.[0]?.elevation,
    equipmentNeeded: location.equipmentNeeded ?? location.routes?.[0]?.equipmentNeeded,
    warnings: location.extra?.warnings ?? location.routes?.[0]?.warnings,
  };

  // 拆分"值"和"单位"
  const splitValue = (raw: string | undefined): [string, string] => {
    if (!raw) return ["—", ""];
    const match = raw.match(/^([\d.]+)\s*(.*)$/);
    return match ? [match[1], match[2]] : [raw, ""];
  };

  const [durVal, durUnit] = splitValue(routeData.duration);
  const [distVal, distUnit] = splitValue(routeData.distance);
  const [elevVal, elevUnit] = splitValue(routeData.elevation);

  // 没有任何路线数据时不渲染
  const hasData = diffInfo || routeData.duration || routeData.distance || routeData.elevation
    || (routeData.equipmentNeeded && routeData.equipmentNeeded.length > 0)
    || (routeData.warnings && routeData.warnings.length > 0)
    || (location.bestSeason && location.bestSeason.length > 0);
  if (!hasData) return null;

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      {/* 标题 */}
      <h2 className="text-base font-bold text-stone-900 mb-4 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-sky-400 flex-shrink-0" />
        {copy.locations.routeInfo}
      </h2>

      {/* 核心数据网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {diffInfo && (
          <DataItem
            icon={<Mountain className="h-4.5 w-4.5" />}
            iconBg={diffInfo.bgColor}
            iconColor={diffInfo.textColor}
            label={copy.locations.difficultyLabel}
            valueNode={
              <div className="space-y-2">
                <span className={cn("font-bold text-sm", diffInfo.textColor)}>
                  {diffInfo.label}
                </span>
                <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                  <DifficultyBar percent={diffInfo.percent} barColor={diffInfo.barColor} />
                </div>
              </div>
            }
          />
        )}
        {routeData.duration && (
          <DataItem
            icon={<Clock className="h-4.5 w-4.5" />}
            iconBg="bg-sky-50"
            iconColor="text-sky-500"
            label={copy.locations.estimatedTime}
            valueNode={<BigNumber value={durVal} unit={durUnit} />}
          />
        )}
        {routeData.distance && (
          <DataItem
            icon={<Ruler className="h-4.5 w-4.5" />}
            iconBg="bg-violet-50"
            iconColor="text-violet-500"
            label={copy.locations.routeLength}
            valueNode={<BigNumber value={distVal} unit={distUnit} />}
          />
        )}
        {routeData.elevation && (
          <DataItem
            icon={<TrendingUp className="h-4.5 w-4.5" />}
            iconBg="bg-stone-100"
            iconColor="text-stone-500"
            label={copy.locations.totalElevation}
            valueNode={<BigNumber value={elevVal} unit={elevUnit} />}
          />
        )}
      </div>

      {/* 最佳季节 */}
      {location.bestSeason && location.bestSeason.length > 0 && (
        <div className="mt-5 pt-4 border-t border-stone-50">
          <p className="text-[11px] text-stone-400 mb-2.5 flex items-center gap-1.5 font-semibold uppercase tracking-wide">
            <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
            {copy.locations.detailSeasonsLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {location.bestSeason.map((season: string, i: number) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-100"
              >
                {season}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 装备建议 */}
      {routeData.equipmentNeeded && routeData.equipmentNeeded.length > 0 && (
        <div className="mt-4 pt-4 border-t border-stone-50">
          <p className="text-[11px] text-stone-400 mb-2.5 flex items-center gap-1.5 font-semibold uppercase tracking-wide">
            <Backpack className="h-3.5 w-3.5 text-amber-400" />
            推荐装备
          </p>
          <div className="flex flex-wrap gap-2">
            {routeData.equipmentNeeded.map((item: string, i: number) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-50 text-stone-600 rounded-lg text-xs font-medium border border-stone-100"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 注意事项 */}
      {routeData.warnings && routeData.warnings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-stone-50">
          <p className="text-[11px] text-orange-500 mb-2.5 flex items-center gap-1.5 font-semibold uppercase tracking-wide">
            <AlertTriangle className="h-3.5 w-3.5" />
            注意事项
          </p>
          <ul className="space-y-2">
            {routeData.warnings.map((w: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-stone-500 leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-300 flex-shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// 难度进度条（带入场动画）
function DifficultyBar({ percent, barColor }: { percent: number; barColor: string }) {
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const t = setTimeout(() => setWidth(percent), 150);
    return () => clearTimeout(t);
  }, [percent]);
  return (
    <div
      className={cn("h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none", barColor)}
      style={{ width: `${width}%` }}
    />
  );
}

// 数据项
function DataItem({
  icon,
  iconBg,
  iconColor,
  label,
  valueNode,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  valueNode: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-stone-50/70 border border-stone-50">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconBg)}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div>
        <p className="text-[10px] text-stone-400 mb-1 font-semibold uppercase tracking-wide">{label}</p>
        {valueNode}
      </div>
    </div>
  );
}

// 大数字展示
function BigNumber({ value, unit }: { value: string; unit: string }) {
  return (
    <span className="flex items-baseline gap-0.5">
      <span className="text-xl font-black text-stone-800 leading-none">{value}</span>
      {unit && <span className="text-xs text-stone-400 font-normal ml-0.5">{unit}</span>}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TeamCard
// ─────────────────────────────────────────────────────────────────────────────

interface TeamCardProps {
  team: Team;
}

/**
 * 队伍卡片（极致优化版）
 * - 左侧日历样式展示出发日期
 * - 右侧队伍标题 + 组织者头像 + 人数气泡
 * - 渐变进度条（绿→橙→红）
 * - hover 阴影上浮
 */
export function TeamCard({ team }: TeamCardProps) {
  const [progressWidth, setProgressWidth] = React.useState(0);

  const ratio = team.maxMembers > 0
    ? Math.min((team.currentMembers / team.maxMembers) * 100, 100)
    : 0;
  const isFull = team.currentMembers >= team.maxMembers;
  const isNearFull = ratio >= 80;

  React.useEffect(() => {
    const t = setTimeout(() => setProgressWidth(ratio), 100);
    return () => clearTimeout(t);
  }, [ratio]);

  const dateInfo = React.useMemo(() => {
    if (!team.date) return null;
    const parts = team.date.split("-");
    if (parts.length < 3) return null;
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
      month: monthNames[month - 1] ?? `${month}月`,
      day: String(day),
      full: team.date,
    };
  }, [team.date]);

  const progressBarClass = isFull
    ? "bg-red-400"
    : isNearFull
      ? "bg-gradient-to-r from-orange-400 to-red-400"
      : "bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-500";

  const leaderName = team.leader?.nickname || team.leader?.name || "";

  return (
    <a href={`/teams/${team.id}`} className="block group">
      <div className="p-4 rounded-xl bg-white border border-stone-100 hover:border-amber-100 hover:shadow-[0_4px_20px_rgba(217,119,6,0.12)] hover:-translate-y-0.5 transition-all duration-200">
        <div className="flex items-start gap-3 mb-3">
          {/* 日历样式日期 */}
          {dateInfo ? (
            <div className="flex-shrink-0 w-12 rounded-xl overflow-hidden border border-stone-100 shadow-sm group-hover:shadow-md group-hover:border-amber-100 transition-all duration-200">
              <div className="bg-amber-500 group-hover:bg-amber-600 py-0.5 text-center transition-colors">
                <span className="text-[9px] font-bold text-white tracking-widest uppercase">
                  {dateInfo.month}
                </span>
              </div>
              <div className="bg-white py-1.5 text-center">
                <span className="text-2xl font-black text-stone-900 leading-none">
                  {dateInfo.day}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-stone-50 flex items-center justify-center border border-stone-100">
              <CalendarDays className="h-5 w-5 text-stone-300" />
            </div>
          )}

          {/* 队伍标题 + 组织者 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-900 group-hover:text-amber-700 transition-colors text-sm leading-snug line-clamp-2 mb-1">
              {team.title}
            </h3>
            {leaderName && (
              <div className="flex items-center gap-1.5">
                {team.leader?.avatar ? (
                  <img
                    src={team.leader.avatar}
                    alt={leaderName}
                    className="w-4 h-4 rounded-full object-cover border border-white shadow-sm"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-amber-600">
                      {leaderName.charAt(0)}
                    </span>
                  </div>
                )}
                <span className="text-[11px] text-stone-400 truncate">{leaderName}</span>
              </div>
            )}
          </div>

          {/* 人数气泡 + 箭头 */}
          <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
            <MemberBubbles current={team.currentMembers} max={team.maxMembers} />
            <ArrowRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all duration-150" />
          </div>
        </div>

        {/* 渐变进度条 */}
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
              progressBarClass
            )}
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        {/* 人数文字 */}
        <div className="mt-1.5 flex items-center justify-end">
          <span
            className={cn(
              "text-[11px] font-semibold",
              isFull ? "text-red-500" : isNearFull ? "text-orange-500" : "text-amber-600"
            )}
          >
            {team.currentMembers}/{team.maxMembers} 人
            {isFull && " · 已满员"}
            {isNearFull && !isFull && " · 即将满员"}
          </span>
        </div>
      </div>
    </a>
  );
}

// 人数气泡
function MemberBubbles({ current, max }: { current: number; max: number }) {
  const displayMax = Math.min(max, 8);
  const filledCount = Math.min(current, displayMax);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: displayMax }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "w-2 h-2 rounded-full transition-colors",
            i < filledCount
              ? "bg-amber-400"
              : "bg-stone-100 border border-stone-200"
          )}
        />
      ))}
      {max > 8 && (
        <span className="text-[10px] text-stone-400 ml-0.5">+{max - 8}</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TeamListSection
// ─────────────────────────────────────────────────────────────────────────────

interface TeamListSectionProps {
  teams: Team[];
  locationId: string;
}

/**
 * 队伍列表区块（极致优化版）
 * - 标题 + CTA 链接
 * - 空状态：温暖情感化设计
 * - 有队伍：渲染 TeamCard 列表
 */
export function TeamListSection({ teams, locationId }: TeamListSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-emerald-400 flex-shrink-0" />
            {copy.locations.detailWaiting}
          </h2>
          <p className="text-xs text-stone-400 mt-0.5 pl-3">
            {teams.length > 0
              ? `${teams.length} ${copy.locations.teamsWaitingDesc}`
              : copy.locations.detailNoTeamsDesc}
          </p>
        </div>
        <a
          href={`/teams/create?locationId=${locationId}`}
          className="text-xs text-amber-600 hover:text-amber-700 font-semibold transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          {copy.locations.detailCreateTeam}
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* 空状态 */}
      {teams.length === 0 ? (
        <EmptyTeamsState locationId={locationId} />
      ) : (
        <div className="space-y-3">
          {teams.map((team: Team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}

// 空状态
function EmptyTeamsState({ locationId }: { locationId: string }) {
  return (
    <div className="flex flex-col items-center py-10">
      {/* 嵌套圆圈装饰 */}
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-amber-100/80 flex items-center justify-center">
            <Users
              className="h-6 w-6 text-amber-400 motion-reduce:animate-none"
              style={{ animation: "float 3s ease-in-out infinite" }}
            />
          </div>
        </div>
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-200" />
        <div className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 rounded-full bg-amber-200" />
      </div>

      <p className="text-stone-500 text-sm text-center max-w-xs leading-relaxed mb-5">
        {copy.locations.detailNoTeamsDesc}
      </p>

      <a href={`/teams/create?locationId=${locationId}`}>
        <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-full text-sm font-semibold transition-all duration-200 shadow-[0_4px_16px_rgba(217,119,6,0.35)] hover:shadow-[0_6px_22px_rgba(217,119,6,0.45)] active:scale-[0.97]">
          <Users className="h-4 w-4" />
          {copy.locations.detailNoTeamsBtn}
        </button>
      </a>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddressRow
// ─────────────────────────────────────────────────────────────────────────────

interface AddressRowProps {
  address: string;
}

/**
 * 地址展示行（优化版）
 * - 图标 + 文字，样式与左栏卡片一致
 */
export function AddressRow({ address }: AddressRowProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 静默失败
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="w-full bg-white rounded-2xl border border-stone-100 px-5 py-4 flex items-start gap-3 text-left group hover:border-amber-100 transition-all duration-150"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
    >
      <MapPin className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
      <span className="text-sm text-stone-500 leading-relaxed flex-1">{address}</span>
      <span className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? (
          <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        )}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PoiSection
// ─────────────────────────────────────────────────────────────────────────────

interface PoiSectionProps {
  locationId: string;
}

/**
 * 打卡点区块（极致优化版）
 * - 异步加载地点关联的 POI 数据
 * - 连接线时间轴样式展示
 * - 按类型着色的图标徽章
 * - 无数据时不渲染
 */
export function PoiSection({ locationId }: PoiSectionProps) {
  const [pois, setPois] = React.useState<RoutePoi[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getLocationPois(locationId)
      .then(setPois)
      .finally(() => setLoading(false));
  }, [locationId]);

  if (loading || pois.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      {/* 标题行 */}
      <h2 className="text-base font-bold text-stone-900 mb-4 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-violet-400 flex-shrink-0" />
        {copy.locations.poiSection}
        <span className="ml-auto text-xs font-normal text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-100">
          {pois.length} 个
        </span>
      </h2>

      {/* 时间轴 POI 列表 */}
      <div className="relative">
        {/* 连接线 */}
        {pois.length > 1 && (
          <div className="absolute left-[19px] top-6 bottom-6 w-px bg-stone-100" />
        )}

        <div className="space-y-3">
          {pois.map((poi, index) => {
            const roleType = poi.roleType as string;
            const colors = POI_COLOR_MAP[roleType] ?? POI_COLOR_MAP.poi;
            const icon = POI_ICON_MAP[roleType] ?? POI_ICON_MAP.poi;
            const roleLabel = copy.locations.poiRoleTypes[
              roleType as keyof typeof copy.locations.poiRoleTypes
            ] ?? roleType;

            return (
              <div key={poi.id} className="flex items-start gap-3">
                {/* 序号 + 图标 */}
                <div className="relative flex-shrink-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10 relative",
                      colors.bg
                    )}
                  >
                    <span className={colors.text}>{icon}</span>
                  </div>
                  {/* 序号小徽章 */}
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-stone-700 flex items-center justify-center z-20">
                    <span className="text-[8px] font-bold text-white">{index + 1}</span>
                  </div>
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-stone-800">{poi.name}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                      colors.bg, colors.text, colors.border
                    )}>
                      {roleLabel}
                    </span>
                  </div>
                  {poi.description && (
                    <p className="text-xs text-stone-500 leading-relaxed">{poi.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
