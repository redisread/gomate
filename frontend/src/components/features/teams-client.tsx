"use client";

import * as React from "react";
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Users,
  X,
  Filter,
  Mountain,
  UserCircle,
  ChevronRight,
  Flame,
  Lock,
  Flag,
  CheckCircle2,
  Tag,
  CalendarDays,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

// ─── 无封面图时的渐变色池（根据 team.id 哈希值自动选取）────────────────────
const CARD_GRADIENTS = [
  "from-amber-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-rose-400 to-pink-500",
  "from-cyan-400 to-sky-500",
];

function getCardGradient(teamId: string): string {
  const index = teamId.charCodeAt(0) % CARD_GRADIENTS.length;
  return CARD_GRADIENTS[index];
}

// ─── 难度配置（浮层徽章，带 emoji）──────────────────────────────────────────
const difficultyConfig: Record<
  string,
  { label: string; emoji: string; badgeColor: string }
> = {
  easy:     { label: "轻松", emoji: "🌿", badgeColor: "bg-amber-500/80 text-white" },
  moderate: { label: "适中", emoji: "⛰",  badgeColor: "bg-amber-500/80 text-white"  },
  hard:     { label: "挑战", emoji: "🧗", badgeColor: "bg-orange-500/80 text-white" },
  expert:   { label: "专家", emoji: "🏔", badgeColor: "bg-red-500/80 text-white"    },
};

// ─── 筛选面板难度选项（各难度有独立专属选中色）───────────────────────────────
const difficultyOptions = [
  { id: "easy",     emoji: "🌿", label: "轻松", activeColor: "bg-amber-600 border-amber-600 text-white" },
  { id: "moderate", emoji: "⛰",  label: "适中", activeColor: "bg-amber-500 border-amber-500 text-white"    },
  { id: "hard",     emoji: "🧗", label: "挑战", activeColor: "bg-orange-500 border-orange-500 text-white"  },
  { id: "expert",   emoji: "🏔", label: "专家", activeColor: "bg-red-500 border-red-500 text-white"        },
];

// ─── 状态徽章配置（带图标和光晕）────────────────────────────────────────────
type StatusCfg = {
  label: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
  pulse: boolean;
  icon?: React.ReactNode;
};

const statusConfig: Record<string, StatusCfg> = {
  recruiting: {
    label: copy.enums.teamStatus.recruiting,
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50 ring-1 ring-amber-200/60",
    textColor: "text-amber-700",
    pulse: true,
  },
  full: {
    label: copy.enums.teamStatus.full,
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50 ring-1 ring-amber-200/60",
    textColor: "text-amber-700",
    pulse: false,
    icon: <Lock className="h-3 w-3" />,
  },
  formed: {
    label: copy.enums.teamStatus.formed,
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-50 ring-1 ring-blue-200/60",
    textColor: "text-blue-700",
    pulse: false,
    icon: <Flag className="h-3 w-3" />,
  },
  completed: {
    label: copy.enums.teamStatus.completed,
    dotColor: "bg-stone-400",
    bgColor: "bg-stone-50 ring-1 ring-stone-200/60",
    textColor: "text-stone-500",
    pulse: false,
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  cancelled: {
    label: copy.enums.teamStatus.cancelled,
    dotColor: "bg-red-400",
    bgColor: "bg-red-50 ring-1 ring-red-200/60",
    textColor: "text-red-600",
    pulse: false,
  },
};

// ─── 进度条三段颜色分级（0-50%: emerald / 51-80%: amber / 81-100%: red）────
function getProgressGradient(pct: number): string {
  if (pct >= 81) return "linear-gradient(to right, #f87171, #ef4444)"; // red
  if (pct >= 51) return "linear-gradient(to right, #fbbf24, #d97706)"; // amber
  return "linear-gradient(to right, #34d399, #059669)";                 // emerald
}

// ─── 人数进度条（三段渐变色 + h-2 + 700ms 过渡）──────────────────────────────
function MemberProgress({ current, max }: { current: number; max: number }) {
  const pct = Math.min((current / max) * 100, 100);
  const remaining = max - current;
  const isFull = current >= max;

  const countColor =
    pct >= 81 ? "text-red-500" : pct >= 51 ? "text-amber-600" : "text-amber-600";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-stone-500">
          <Users className="h-3.5 w-3.5" />
          {current}/{max} 人
        </span>
        {isFull ? (
          <span className={cn("font-semibold", countColor)}>已满员</span>
        ) : (
          <span className={cn("font-semibold", countColor)}>
            还差 {remaining} 人
          </span>
        )}
      </div>
      {/* h-2 + 700ms 过渡 + 三段颜色渐变 */}
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: getProgressGradient(pct) }}
        />
      </div>
    </div>
  );
}

// ─── 状态徽章（呼吸动画 + 光晕背景）─────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? {
    label: status,
    dotColor: "bg-stone-400",
    bgColor: "bg-stone-50",
    textColor: "text-stone-500",
    pulse: false,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        cfg.bgColor,
        cfg.textColor
      )}
    >
      {/* 脉冲点 or 图标 */}
      {cfg.icon ? (
        cfg.icon
      ) : (
        <span className="relative flex h-2 w-2">
          {cfg.pulse && (
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                cfg.dotColor
              )}
            />
          )}
          <span
            className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              cfg.dotColor
            )}
          />
        </span>
      )}
      {cfg.label}
    </span>
  );
}

// ─── 队伍卡片（顶部横幅图 + 底部信息布局）───────────────────────────────────
function TeamCard({ team }: { team: Team }) {
  const location = (team as any).location;
  const diff = location?.difficulty
    ? difficultyConfig[location.difficulty]
    : null;
  const leaderName = team.leader?.nickname || team.leader?.name || "领队";
  const gradient = getCardGradient(team.id);

  return (
    <a href={`/teams/${team.id}`} className="group block">
      <article
        className={cn(
          "bg-white rounded-3xl border border-stone-100 overflow-hidden",
          "transition-all duration-300",
          "hover:border-amber-200 hover:shadow-2xl hover:shadow-amber-100/40",
          "hover:-translate-y-1.5"
        )}
      >
        {/* ── 顶部封面图（固定 h-40）── */}
        <div className="relative h-40 overflow-hidden">
          {location?.coverImage ? (
            <img
              src={location.coverImage}
              alt={location.name ?? "封面"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            /* 无封面图：渐变色块 + 山脉图标 */
            <div
              className={cn(
                "w-full h-full bg-gradient-to-br flex items-center justify-center",
                gradient
              )}
            >
              <Mountain className="h-12 w-12 text-white/40" />
            </div>
          )}

          {/* 底部渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 to-transparent" />

          {/* 浮层徽章：难度（左下）+ 状态（右下）*/}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
            {diff ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm",
                  diff.badgeColor
                )}
              >
                {diff.emoji} {diff.label}
              </span>
            ) : (
              <span />
            )}
            <StatusBadge status={team.status} />
          </div>
        </div>

        {/* ── 底部内容区 ── */}
        <div className="p-5">
          {/* 标题 + 箭头 */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-stone-900 group-hover:text-amber-800 transition-colors line-clamp-2 leading-snug text-base">
              {team.title}
            </h3>
            <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" />
          </div>

          {/* 📍 地点名 · 难度 */}
          {location?.name && (
            <p className="text-xs text-stone-400 flex items-center gap-1 mb-3">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-stone-300" />
              {location.name}
              {diff && (
                <>
                  <span className="text-stone-200 mx-0.5">·</span>
                  <span>{diff.emoji} {diff.label}</span>
                </>
              )}
            </p>
          )}

          {/* 📅 日期  ⏰ 时间出发 */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 mb-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {team.date}
            </span>
            {team.time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {team.time} {copy.teams.departureSuffix}
              </span>
            )}
          </div>

          {/* 渐变进度条（三段色）*/}
          <MemberProgress current={team.currentMembers} max={team.maxMembers} />

          {/* 领队信息 + 查看详情 */}
          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-stone-50">
            <div className="flex items-center gap-2">
              {team.leader?.avatar ? (
                <img
                  src={team.leader.avatar}
                  alt={leaderName}
                  className="w-6 h-6 rounded-full object-cover ring-2 ring-white"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-stone-400" />
                </div>
              )}
              <span className="text-xs text-stone-400">
                {copy.teams.leaderLabel}{" "}
                <span className="text-stone-600 font-medium">{leaderName}</span>
              </span>
            </div>
            <span className="text-xs text-stone-300 group-hover:text-amber-500 transition-colors flex items-center gap-0.5 flex-shrink-0">
              {copy.common.viewDetail}
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </article>
    </a>
  );
}

// ─── 骨架屏（上图下文，与新卡片 h-40 对齐）──────────────────────────────────
function TeamSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden">
      {/* 封面图骨架（h-40）*/}
      <div className="skeleton h-40 rounded-none" />
      {/* 内容区骨架 */}
      <div className="p-5 space-y-3">
        <div className="skeleton h-5 rounded-full w-4/5" />
        <div className="skeleton h-3.5 rounded-full w-1/2" />
        <div className="skeleton h-3.5 rounded-full w-3/4" />
        <div className="skeleton h-2 rounded-full w-full" />
        <div className="flex justify-between items-center pt-1">
          <div className="skeleton h-4 rounded-full w-24" />
          <div className="skeleton h-4 rounded-full w-16" />
        </div>
      </div>
    </div>
  );
}

// ─── 空状态（Mountain 大图标 + 叠层圆形装饰，w-28 h-28）─────────────────────
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      {/* 三层叠圆 + Mountain 图标 */}
      <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-stone-100/80" />
        <div className="absolute inset-3 rounded-full bg-stone-100" />
        <div className="absolute inset-6 rounded-full bg-stone-200/60" />
        <Mountain className="relative h-10 w-10 text-stone-400 z-10" />
      </div>

      <h3 className="text-lg font-semibold text-stone-700 mb-2">
        {copy.teams.noResults}
      </h3>
      <p className="text-stone-400 text-sm text-center max-w-xs leading-relaxed mb-6">
        {copy.teams.noResultsTip}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onClear}
          className="px-5 py-2.5 border border-stone-200 hover:border-stone-300 text-stone-600 rounded-full text-sm font-medium transition-colors"
        >
          {copy.teams.clearFilters}
        </button>
        <a href="/teams/create">
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-sm font-medium transition-colors">
            <Flame className="h-4 w-4" />
            {copy.teams.createBtn}
          </button>
        </a>
      </div>
    </div>
  );
}

// ─── 分页器（hover scale + 当前页阴影）────────────────────────────────────────
function Pagination({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (total <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2 mt-12">
      {Array.from({ length: total }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          onClick={() => onChange(page)}
          aria-current={page === current ? "page" : undefined}
          className={cn(
            "w-10 h-10 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105",
            page === current
              ? "bg-amber-600 text-white shadow-md shadow-amber-200"
              : "bg-white text-stone-500 border border-stone-200 hover:border-amber-300 hover:text-amber-700"
          )}
        >
          {page}
        </button>
      ))}
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────

/**
 * 队伍列表页客户端组件 - React Island
 * 设计主题：温暖、有情感温度的山野伙伴社区
 */
export function TeamsClient() {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({
    total: 0,
    totalPages: 0,
    pageSize: 12,
  });
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<string[]>([]);
  
  // 日期范围筛选
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  
  // 标签筛选
  const [availableTags, setAvailableTags] = React.useState<{ id: string; name: string }[]>([]);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);

  // 初始化：从 URL 读取筛选条件
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    const page = parseInt(params.get("page") || "1", 10);
    const difficulty = params.get("difficulty")?.split(",").filter(Boolean) || [];
    const start = params.get("startDate") || "";
    const end = params.get("endDate") || "";
    const tags = params.get("tags")?.split(",").filter(Boolean) || [];
    
    setSearchQuery(q);
    setCurrentPage(page);
    setSelectedDifficulty(difficulty);
    setStartDate(start);
    setEndDate(end);
    setSelectedTags(tags);
    
    loadTeams({ 
      page, 
      search: q, 
      difficulty,
      startDateFrom: start,
      startDateTo: end,
      tagIds: tags,
    });
  }, []);
  
  // 加载可用标签（type=activity）
  React.useEffect(() => {
    fetchAPI("/tags?type=activity")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.tags) {
          setAvailableTags(data.tags);
        }
      })
      .catch(() => {});
  }, []);

  // 搜索防抖
  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadTeams({ 
        page: 1, 
        search: searchQuery, 
        difficulty: selectedDifficulty,
        startDateFrom: startDate,
        startDateTo: endDate,
        tagIds: selectedTags,
      });
      updateURL();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedDifficulty, startDate, endDate, selectedTags]);

  const loadTeams = React.useCallback(
    async (params: {
      page?: number;
      search?: string;
      difficulty?: string[];
      startDateFrom?: string;
      startDateTo?: string;
      tagIds?: string[];
    }) => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams();
        query.set("status", "recruiting");
        if (params.page) query.set("page", params.page.toString());
        query.set("pageSize", "12");
        if (params.search) query.set("search", params.search);
        if (params.difficulty?.length)
          query.set("difficulty", params.difficulty.join(","));
        if (params.startDateFrom) query.set("startDateFrom", params.startDateFrom);
        if (params.startDateTo) query.set("startDateTo", params.startDateTo);
        if (params.tagIds?.length) query.set("tagIds", params.tagIds.join(","));

        const res = await fetchAPI(`/teams?${query}`);
        const data = await res.json();
        if (data.success) {
          setTeams(data.teams || []);
          setPagination(
            data.pagination || { total: 0, totalPages: 0, pageSize: 12 }
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );
  
  // 更新 URL 参数
  const updateURL = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (currentPage > 1) params.set("page", currentPage.toString());
    if (selectedDifficulty.length) params.set("difficulty", selectedDifficulty.join(","));
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (selectedTags.length) params.set("tags", selectedTags.join(","));
    
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  };

  const handleDifficultyToggle = (id: string) => {
    const next = selectedDifficulty.includes(id)
      ? selectedDifficulty.filter((d) => d !== id)
      : [...selectedDifficulty, id];
    setSelectedDifficulty(next);
    setCurrentPage(1);
  };
  
  const handleTagToggle = (tagId: string) => {
    const next = selectedTags.includes(tagId)
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(next);
    setCurrentPage(1);
  };
  
  // 日期快捷选择
  const handleDateQuickSelect = (type: string) => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    
    switch (type) {
      case "today":
        setStartDate(formatDate(today));
        setEndDate(formatDate(today));
        break;
      case "tomorrow":
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        setStartDate(formatDate(tomorrow));
        setEndDate(formatDate(tomorrow));
        break;
      case "weekend": {
        const day = today.getDay();
        const daysUntilSaturday = day === 0 ? 6 : 6 - day; // 0=周日
        const saturday = new Date(today);
        saturday.setDate(today.getDate() + daysUntilSaturday);
        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1);
        setStartDate(formatDate(saturday));
        setEndDate(formatDate(sunday));
        break;
      }
      case "7days": {
        const next7Days = new Date(today);
        next7Days.setDate(today.getDate() + 7);
        setStartDate(formatDate(today));
        setEndDate(formatDate(next7Days));
        break;
      }
      case "30days": {
        const next30Days = new Date(today);
        next30Days.setDate(today.getDate() + 30);
        setStartDate(formatDate(today));
        setEndDate(formatDate(next30Days));
        break;
      }
      case "clear":
        setStartDate("");
        setEndDate("");
        break;
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadTeams({ 
      page, 
      search: searchQuery, 
      difficulty: selectedDifficulty,
      startDateFrom: startDate,
      startDateTo: endDate,
      tagIds: selectedTags,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => {
    setSelectedDifficulty([]);
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedTags([]);
    setCurrentPage(1);
    setShowFilters(false);
  };

  const activeFiltersCount = selectedDifficulty.length + (startDate ? 1 : 0) + (endDate ? 1 : 0) + selectedTags.length;

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* ── Header 区域（暖调渐变 + 山脉 SVG + 圆点装饰）── */}
      <section className="relative pt-24 pb-8 border-b border-stone-100 overflow-hidden bg-gradient-to-b from-amber-50 via-orange-50/20 to-stone-50">
        {/* 山脉 SVG 装饰（右侧，fill-amber-900，opacity-[0.07]）*/}
        <svg
          className="absolute right-0 bottom-0 opacity-[0.07] w-96 h-48 pointer-events-none select-none"
          viewBox="0 0 400 200"
          aria-hidden="true"
        >
          <path
            d="M0,200 L80,80 L160,140 L240,40 L320,100 L400,60 L400,200 Z"
            className="fill-amber-900"
          />
        </svg>

        {/* 圆点网格装饰（左上角）*/}
        <svg
          className="absolute left-8 top-28 opacity-[0.06] w-32 h-32 pointer-events-none select-none"
          viewBox="0 0 128 128"
          aria-hidden="true"
        >
          {Array.from({ length: 25 }, (_, i) => (
            <circle
              key={i}
              cx={(i % 5) * 24 + 12}
              cy={Math.floor(i / 5) * 24 + 12}
              r="3"
              className="fill-stone-600"
            />
          ))}
        </svg>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 徽章 + 统计数字 */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100/80 text-amber-700 text-xs font-semibold">
              <Users className="h-3.5 w-3.5" />
              {copy.teams.pageBadge}
            </div>
            {/* 活力数字徽章 */}
            {!isLoading && pagination.total > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100/80 text-amber-700 text-xs font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                {pagination.total} 支队伍等你
              </div>
            )}
          </div>

          {/* 主标题 + 情感化标语 */}
          <div className="mb-7">
            <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
              {copy.teams.pageTitle}
            </h1>
            {/* TODO: 添加到 copy.ts: teams.pageTagline */}
            <p className="text-stone-500 text-base">
              有趣的地点，同频的伙伴
            </p>
          </div>

          {/* 搜索框 + 筛选按钮 */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
              <input
                type="text"
                placeholder="梧桐山？七娘山？或者输入任意关键词"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="搜索队伍"
                className={cn(
                  "w-full pl-12 pr-10 py-3.5 rounded-2xl text-stone-900 placeholder-stone-400",
                  "bg-white border border-stone-200 transition-all duration-200",
                  "focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15"
                )}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label="清除搜索"
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-stone-400" />
                </button>
              )}
            </div>

            {/* 筛选按钮 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              className={cn(
                "flex items-center gap-2 px-5 py-3.5 border rounded-2xl font-medium transition-all duration-200 text-sm",
                showFilters || activeFiltersCount > 0
                  ? "bg-amber-50 border-amber-300 text-amber-700 shadow-sm"
                  : "bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
              )}
            >
              <Filter className="h-4 w-4" />
              {copy.common.filter}
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 bg-amber-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* 筛选面板（展开动画）*/}
          {showFilters && (
            <div className="mt-4 pt-5 pb-1 border-t border-stone-100/80 space-y-5 animate-in slide-in-from-top-2 duration-200">
              {/* 日期范围筛选 */}
              <div>
                <span className="text-sm font-semibold text-stone-600 mb-3 block flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {copy.filter.dateRange}
                </span>
                {/* 快捷选项 */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { key: "today", label: copy.filter.dateQuickToday },
                    { key: "tomorrow", label: copy.filter.dateQuickTomorrow },
                    { key: "weekend", label: copy.filter.dateQuickWeekend },
                    { key: "7days", label: copy.filter.dateQuick7Days },
                    { key: "30days", label: copy.filter.dateQuick30Days },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => handleDateQuickSelect(opt.key)}
                      className="px-3 py-1.5 text-xs rounded-full border border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:text-amber-700 transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                  {(startDate || endDate) && (
                    <button
                      onClick={() => handleDateQuickSelect("clear")}
                      className="px-3 py-1.5 text-xs rounded-full border border-stone-200 text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      清除
                    </button>
                  )}
                </div>
                {/* 日期输入 */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 text-stone-700 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />
                  </div>
                  <span className="text-stone-400 text-sm">至</span>
                  <div className="flex-1">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      min={startDate}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 text-stone-700 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />
                  </div>
                </div>
              </div>

              {/* 难度筛选 */}
              <div>
                <span className="text-sm font-semibold text-stone-600 mb-3 block">
                  {copy.filter.difficulty}
                </span>
                {/* 各难度选项有独立专属选中色 */}
                <div className="flex flex-wrap gap-2">
                  {difficultyOptions.map((opt) => {
                    const isSelected = selectedDifficulty.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleDifficultyToggle(opt.id)}
                        className={cn(
                          "px-4 py-2 text-sm rounded-full border transition-all duration-200 active:scale-95 shadow-sm",
                          isSelected
                            ? opt.activeColor
                            : "bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                        )}
                      >
                        {opt.emoji} {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 标签筛选 */}
              {availableTags.length > 0 && (
                <div>
                  <span className="text-sm font-semibold text-stone-600 mb-3 block flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    {copy.filter.tags}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => handleTagToggle(tag.id)}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-full border transition-all duration-200",
                            isSelected
                              ? "bg-amber-100 border-amber-400 text-amber-800"
                              : "bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                          )}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  {copy.filter.clearAll}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── 队伍列表 ── */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 结果计数（「N 支队伍向你敞开，随时可以出发」）*/}
          <div className="mb-6 text-sm text-stone-400">
            {isLoading ? (
              <span className="inline-block w-40 h-4 bg-stone-200 rounded-full animate-pulse" />
            ) : pagination.total > 0 ? (
              <>
                <span className="font-semibold text-stone-700">
                  {pagination.total}
                </span>
                {/* TODO: 添加到 copy.ts: teams.totalCountV2 */}
                {" "}支队伍向你敞开，随时可以出发
              </>
            ) : null}
          </div>

          {/* 卡片网格（移动端单列，桌面双列）*/}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <TeamSkeleton key={i} />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          )}

          {/* 分页器 */}
          <Pagination
            current={currentPage}
            total={pagination.totalPages}
            onChange={handlePageChange}
          />

          {/* ── CTA 底部区域（渐变背景 + 内联山脉 SVG）── */}
          <div className="relative mt-16 text-center rounded-3xl border border-stone-100/80 p-10 overflow-hidden bg-gradient-to-br from-amber-50/60 via-white to-amber-50/40">
            {/* 背景山脉装饰 */}
            <svg
              className="absolute right-0 bottom-0 opacity-[0.06] w-64 h-32 pointer-events-none"
              viewBox="0 0 256 128"
              aria-hidden="true"
            >
              <path
                d="M0,128 L50,50 L100,90 L160,20 L210,70 L256,40 L256,128 Z"
                fill="currentColor"
                className="text-amber-700"
              />
            </svg>

            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
                <Mountain className="h-7 w-7 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-stone-900 mb-3">
                {copy.teams.ctaTitle}
              </h2>
              <p className="text-stone-500 mb-7 max-w-sm mx-auto leading-relaxed">
                {copy.teams.ctaDesc}
              </p>
              <a href="/teams/create">
                <button className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-8 py-3.5 rounded-full font-medium transition-all duration-200 hover:shadow-lg hover:shadow-amber-200/60">
                  <Flame className="h-4 w-4" />
                  {copy.teams.createBtn}
                </button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
