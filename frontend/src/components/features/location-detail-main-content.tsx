"use client";

/**
 * 地点详情页 - 主内容区左栏组件集合
 *
 * 包含：
 * - LocationIntroCard：地点介绍（展开/收起、标签、图片画廊预览）
 * - RouteInfoCard：路线数据网格（大数字展示、难度进度条、装备清单）
 * - TeamListSection：队伍列表容器（空状态、列表）
 * - TeamCard：单个队伍卡片（日历日期、头像人数气泡、渐变进度条）
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
} from "lucide-react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { Location, Team, Tag } from "@/lib/types";

// ─── 难度配置（与 location-detail-client.tsx 保持一致）──────────────────────
const DIFFICULTY_CONFIG: Record<
  string,
  {
    label: string;
    /** 进度条颜色（Tailwind）*/
    barColor: string;
    /** 文字颜色 */
    textColor: string;
    /** 图标背景 */
    bgColor: string;
    /** 难度百分比（用于进度条展示）*/
    percent: number;
  }
> = {
  easy: {
    label: copy.enums.difficulty.easy,
    barColor: "bg-emerald-400",
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-50",
    percent: 25,
  },
  moderate: {
    label: copy.enums.difficulty.moderate,
    barColor: "bg-amber-400",
    textColor: "text-amber-700",
    bgColor: "bg-amber-50",
    percent: 50,
  },
  hard: {
    label: copy.enums.difficulty.hard,
    barColor: "bg-orange-500",
    textColor: "text-orange-700",
    bgColor: "bg-orange-50",
    percent: 75,
  },
  expert: {
    label: copy.enums.difficulty.expert,
    barColor: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    percent: 100,
  },
};

// ─── 常量 ────────────────────────────────────────────────────────────────────
/** 地点介绍默认收起时显示的最大行数 */
const INTRO_CLAMP_LINES = 4;

// ─────────────────────────────────────────────────────────────────────────────
// LocationIntroCard
// ─────────────────────────────────────────────────────────────────────────────

interface LocationIntroCardProps {
  location: Location;
}

/**
 * 地点介绍卡片
 * - 超过 4 行描述时截断，点击「展开」可查看全文
 * - 地点封面图 + images 的缩略图画廊行
 * - 标签胶囊（hover 变色）
 */
export function LocationIntroCard({ location }: LocationIntroCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [isOverflow, setIsOverflow] = React.useState(false);
  const descRef = React.useRef<HTMLParagraphElement>(null);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  // 检测描述是否溢出（是否需要展开/收起按钮）
  React.useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    // 收起状态下若 scrollHeight > clientHeight 说明有截断
    setIsOverflow(el.scrollHeight > el.clientHeight + 2);
  }, [location.description]);

  // 画廊图片列表：封面图 + 额外图片（去重）
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

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm overflow-hidden">
      {/* ── 图片画廊预览行 ──────────────────────────────────────────────────── */}
      {galleryImages.length > 0 && (
        <div className="px-6 pt-5 pb-0">
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {galleryImages.slice(0, 6).map((img, idx) => (
              <button
                key={idx}
                onClick={() => setLightboxIndex(idx)}
                className="relative flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                aria-label={`查看图片 ${idx + 1}`}
              >
                <img
                  src={img}
                  alt={`${location.name} 图片 ${idx + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
                {/* 最后一张加「更多」遮罩 */}
                {idx === 5 && galleryImages.length > 6 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold flex items-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5" />
                      +{galleryImages.length - 6}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-6">
        {/* ── 标题 ──────────────────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-900 mb-3">
          {copy.locations.locationIntro}
        </h2>

        {/* ── 描述（展开/收起）────────────────────────────────────────────── */}
        <div className="relative">
          <p
            ref={descRef}
            className={cn(
              "text-sm text-stone-500 leading-[1.85] tracking-wide transition-all duration-300",
              !expanded && "line-clamp-4"
            )}
            style={{ letterSpacing: "0.01em" }}
          >
            {location.description}
          </p>

          {/* 收起时底部渐变遮罩 */}
          {!expanded && isOverflow && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>

        {/* 展开/收起按钮（仅在有截断时显示）*/}
        {isOverflow && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
          >
            {expanded ? (
              <>
                收起 <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                展开全文 <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}

        {/* ── 标签区 ────────────────────────────────────────────────────────── */}
        {location.tags && location.tags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-stone-50 flex flex-wrap gap-2">
            {location.tags.map((tag: Tag, i: number) => (
              <span
                key={tag?.id ?? i}
                className="px-3 py-1 bg-amber-50/80 text-amber-700 rounded-full text-xs border border-amber-100 hover:bg-amber-100 hover:border-amber-200 hover:text-amber-800 transition-colors duration-150 cursor-default select-none"
              >
                {typeof tag === "string" ? tag : tag?.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox（简易全屏预览）────────────────────────────────────────── */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <img
            src={galleryImages[lightboxIndex]}
            alt={`${location.name} 大图`}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {/* 关闭提示 */}
          <p className="absolute bottom-6 text-white/60 text-xs">点击任意处关闭</p>
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
 * 路线信息卡片
 * - 大数字 + 小单位展示核心数据（时长/距离/爬升）
 * - 难度用彩色进度条形式展示
 * - 最佳季节 + 装备建议 + 安全注意事项
 */
export function RouteInfoCard({ location }: RouteInfoCardProps) {
  const diffInfo = location.difficulty
    ? (DIFFICULTY_CONFIG[location.difficulty] ?? DIFFICULTY_CONFIG.easy)
    : null;

  // 从 routes[0] 兼容层提取数据
  const routeData = {
    duration: location.duration ?? location.routes?.[0]?.duration,
    distance: (location as any).distance ?? location.routes?.[0]?.distance,
    elevation: (location as any).elevation ?? location.routes?.[0]?.elevation,
    equipmentNeeded:
      location.equipmentNeeded ??
      location.routes?.[0]?.equipmentNeeded,
    warnings:
      location.extra?.warnings ??
      location.routes?.[0]?.warnings,
  };

  // 拆分"值"和"单位"（如 "6h" → ["6", "h"]，"12km" → ["12", "km"]）
  const splitValue = (raw: string | undefined): [string, string] => {
    if (!raw) return ["—", ""];
    const match = raw.match(/^([\d.]+)\s*(.*)$/);
    return match ? [match[1], match[2]] : [raw, ""];
  };

  const [durVal, durUnit] = splitValue(routeData.duration);
  const [distVal, distUnit] = splitValue(routeData.distance);
  const [elevVal, elevUnit] = splitValue(routeData.elevation);

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm p-6">
      <h2 className="text-lg font-semibold text-stone-900 mb-5">
        {copy.locations.routeInfo}
      </h2>

      {/* ── 4 个核心数据项 ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 难度 */}
        {diffInfo && (
          <DataItem
            icon={<Mountain className="h-5 w-5" />}
            iconBg={diffInfo.bgColor}
            iconColor={diffInfo.textColor}
            label={copy.locations.difficultyLabel}
            valueNode={
              <div className="space-y-1.5">
                <span className={cn("font-bold text-base", diffInfo.textColor)}>
                  {diffInfo.label}
                </span>
                {/* 难度进度条 */}
                <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", diffInfo.barColor)}
                    style={{ width: `${diffInfo.percent}%` }}
                  />
                </div>
              </div>
            }
          />
        )}

        {/* 时长 */}
        {routeData.duration && (
          <DataItem
            icon={<Clock className="h-5 w-5" />}
            iconBg="bg-sky-50"
            iconColor="text-sky-500"
            label={copy.locations.estimatedTime}
            valueNode={<BigNumber value={durVal} unit={durUnit} />}
          />
        )}

        {/* 距离 */}
        {routeData.distance && (
          <DataItem
            icon={<Ruler className="h-5 w-5" />}
            iconBg="bg-violet-50"
            iconColor="text-violet-500"
            label={copy.locations.routeLength}
            valueNode={<BigNumber value={distVal} unit={distUnit} />}
          />
        )}

        {/* 爬升 */}
        {routeData.elevation && (
          <DataItem
            icon={<TrendingUp className="h-5 w-5" />}
            iconBg="bg-stone-100"
            iconColor="text-stone-500"
            label={copy.locations.totalElevation}
            valueNode={<BigNumber value={elevVal} unit={elevUnit} />}
          />
        )}
      </div>

      {/* ── 最佳季节 ────────────────────────────────────────────────────────── */}
      {location.bestSeason && location.bestSeason.length > 0 && (
        <div className="mt-5 pt-5 border-t border-stone-50">
          <p className="text-xs text-stone-400 mb-2.5 flex items-center gap-1.5 font-medium">
            <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
            {copy.locations.detailSeasonsLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {location.bestSeason.map((season: string, i: number) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100"
              >
                {season}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── 装备建议 ────────────────────────────────────────────────────────── */}
      {routeData.equipmentNeeded && routeData.equipmentNeeded.length > 0 && (
        <div className="mt-5 pt-5 border-t border-stone-50">
          <p className="text-xs text-stone-400 mb-2.5 flex items-center gap-1.5 font-medium">
            <Backpack className="h-3.5 w-3.5 text-amber-400" />
            推荐装备
          </p>
          <div className="flex flex-wrap gap-2">
            {routeData.equipmentNeeded.map((item: string, i: number) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-50 text-stone-600 rounded-lg text-xs border border-stone-100"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── 注意事项（警告样式）────────────────────────────────────────────── */}
      {routeData.warnings && routeData.warnings.length > 0 && (
        <div className="mt-5 pt-5 border-t border-stone-50">
          <p className="text-xs text-orange-500 mb-2.5 flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            注意事项
          </p>
          <ul className="space-y-1.5">
            {routeData.warnings.map((w: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-stone-500">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-orange-400 flex-shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── 路线信息：数据项（带图标+标签+自定义值节点）────────────────────────────
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
    <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-stone-50/60">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", iconBg)}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div>
        <p className="text-[11px] text-stone-400 mb-1 font-medium">{label}</p>
        {valueNode}
      </div>
    </div>
  );
}

// ── 大数字展示（如 "6" + "h"）───────────────────────────────────────────────
function BigNumber({ value, unit }: { value: string; unit: string }) {
  return (
    <span className="flex items-baseline gap-0.5">
      <span className="text-xl font-bold text-stone-800 leading-none">{value}</span>
      {unit && <span className="text-xs text-stone-400 font-normal">{unit}</span>}
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
 * 队伍卡片
 * - 左侧日历样式展示出发日期（月份小字 + 日期大字）
 * - 右侧队伍标题 + 组织者头像 + 人数气泡
 * - 渐变进度条（绿→橙→红，随满员程度变化）
 * - hover 有明显阴影上浮效果
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

  // 解析日期（支持 "2025-06-15" 格式）
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

  // 进度条颜色（随满员程度渐变）
  const progressBarClass = isFull
    ? "bg-red-400"
    : isNearFull
      ? "bg-gradient-to-r from-orange-400 to-red-400"
      : "bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-500";

  // 显示名（优先昵称）
  const leaderName =
    team.leader?.nickname || team.leader?.name || "";

  return (
    <a href={`/teams/${team.id}`} className="block group">
      <div className="p-4 rounded-xl bg-white border border-stone-100 hover:shadow-warm-md hover:-translate-y-0.5 hover:border-amber-100 transition-all duration-200">
        <div className="flex items-start gap-3 mb-3">
          {/* ── 日历样式日期 ───────────────────────────────────────────────── */}
          {dateInfo ? (
            <div className="flex-shrink-0 w-11 rounded-xl overflow-hidden border border-stone-100 shadow-sm">
              {/* 月份条 */}
              <div className="bg-amber-500 py-0.5 text-center">
                <span className="text-[9px] font-semibold text-white tracking-wider uppercase">
                  {dateInfo.month}
                </span>
              </div>
              {/* 日期数字 */}
              <div className="bg-white py-1 text-center">
                <span className="text-xl font-bold text-stone-900 leading-none">
                  {dateInfo.day}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-stone-50 flex items-center justify-center border border-stone-100">
              <CalendarDays className="h-5 w-5 text-stone-300" />
            </div>
          )}

          {/* ── 队伍标题 + 组织者 ──────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-stone-900 group-hover:text-amber-700 transition-colors text-sm leading-snug line-clamp-2">
              {team.title}
            </h3>
            {/* 领队信息行 */}
            {leaderName && (
              <div className="mt-1 flex items-center gap-1.5">
                {/* 领队头像 */}
                {team.leader?.avatar ? (
                  <img
                    src={team.leader.avatar}
                    alt={leaderName}
                    className="w-4 h-4 rounded-full object-cover border border-white shadow-sm"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="text-[9px] font-semibold text-amber-600">
                      {leaderName.charAt(0)}
                    </span>
                  </div>
                )}
                <span className="text-[11px] text-stone-400 truncate">{leaderName}</span>
              </div>
            )}
          </div>

          {/* ── 人数气泡组 ─────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <MemberBubbles current={team.currentMembers} max={team.maxMembers} />
            <ArrowRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-amber-500 transition-colors" />
          </div>
        </div>

        {/* ── 渐变进度条 ──────────────────────────────────────────────────── */}
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
              progressBarClass
            )}
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        {/* 人数文字（在进度条下方）*/}
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[11px] text-stone-400">
            {team.date && !dateInfo ? team.date : ""}
          </span>
          <span
            className={cn(
              "text-[11px] font-medium",
              isFull ? "text-red-500" : isNearFull ? "text-orange-500" : "text-amber-600"
            )}
          >
            {team.currentMembers}/{team.maxMembers} 人
            {isFull && " · 已满"}
          </span>
        </div>
      </div>
    </a>
  );
}

/**
 * 人数气泡组件
 * 用小圆形代表每个人数名额（已占用 vs 空余），最多显示 8 个点位
 */
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
              : "bg-stone-150 border border-stone-200"
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
 * 队伍列表区块
 * - 包含标题、CTA 链接
 * - 空状态：温暖情感化设计
 * - 有队伍：渲染 TeamCard 列表
 */
export function TeamListSection({ teams, locationId }: TeamListSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm p-6">
      {/* ── 头部 ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            {copy.locations.detailWaiting}
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            {teams.length > 0
              ? `${teams.length} ${copy.locations.teamsWaitingDesc}`
              : copy.locations.detailNoTeamsDesc}
          </p>
        </div>
        <a
          href={`/teams/create?locationId=${locationId}`}
          className="text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          {copy.locations.detailCreateTeam}
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* ── 空状态 ────────────────────────────────────────────────────────── */}
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

// ── 空状态：温暖情感化设计 ───────────────────────────────────────────────────
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
        {/* 小装饰点 */}
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-200" />
        <div className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 rounded-full bg-amber-200" />
      </div>

      <p className="text-stone-500 text-sm text-center max-w-xs leading-relaxed mb-5">
        {copy.locations.detailNoTeamsDesc}
      </p>

      <a href={`/teams/create?locationId=${locationId}`}>
        <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-full text-sm font-medium transition-all duration-200 shadow-brand-glow hover:shadow-brand-glow-lg active:scale-[0.97]">
          <Users className="h-4 w-4" />
          {copy.locations.detailNoTeamsBtn}
        </button>
      </a>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddressRow（独立地址行，供主组件按需使用）
// ─────────────────────────────────────────────────────────────────────────────

interface AddressRowProps {
  address: string;
}

/**
 * 地址展示行
 * 样式与左栏卡片保持一致
 */
export function AddressRow({ address }: AddressRowProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm px-5 py-4 flex items-start gap-3">
      <MapPin className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
      <span className="text-sm text-stone-500 leading-relaxed">{address}</span>
    </div>
  );
}
