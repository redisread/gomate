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
  LogIn,
  AlertCircle,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  DIFFICULTY_CONFIG,
  DIFFICULTY_OPTIONS,
  STATUS_CONFIG,
  getCardGradient,
  getProgressGradient,
} from "@/lib/constants";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { authClient } from "@/lib/auth-client";

// ─── 状态徽章配置扩展（带图标）────────────────────────────────────────────
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
    bgColor: "bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-200/60 dark:ring-amber-900/50",
    textColor: "text-amber-700 dark:text-amber-400",
    pulse: true,
  },
  full: {
    label: copy.enums.teamStatus.full,
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-200/60 dark:ring-amber-900/50",
    textColor: "text-amber-700 dark:text-amber-400",
    pulse: false,
    icon: <Lock className="h-3 w-3" />,
  },
  formed: {
    label: copy.enums.teamStatus.formed,
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-200/60 dark:ring-blue-900/50",
    textColor: "text-blue-700 dark:text-blue-400",
    pulse: false,
    icon: <Flag className="h-3 w-3" />,
  },
  completed: {
    label: copy.enums.teamStatus.completed,
    dotColor: "bg-stone-400",
    bgColor: "bg-stone-100 dark:bg-stone-800 ring-1 ring-stone-200 dark:ring-stone-700",
    textColor: "text-stone-500 dark:text-stone-400",
    pulse: false,
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  cancelled: {
    label: copy.enums.teamStatus.cancelled,
    dotColor: "bg-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30 ring-1 ring-red-200/60 dark:ring-red-900/50",
    textColor: "text-red-600 dark:text-red-400",
    pulse: false,
  },
};

// ─── 辅助函数：计算距离出发还有几天 ─────────────────────────────────────────
function getDaysUntilStart(dateStr: string): { days: number; text: string; urgent: boolean; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(dateStr);
  startDate.setHours(0, 0, 0, 0);
  
  const diffTime = startDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { days: diffDays, text: "已出发", urgent: false, color: "text-stone-400 dark:text-stone-500" };
  }
  if (diffDays === 0) {
    return { days: 0, text: "今天出发", urgent: true, color: "text-red-600" };
  }
  if (diffDays === 1) {
    return { days: 1, text: "明天出发", urgent: true, color: "text-red-600" };
  }
  if (diffDays <= 3) {
    return { days: diffDays, text: `仅剩${diffDays}天`, urgent: true, color: "text-amber-600" };
  }
  return { days: diffDays, text: `还有${diffDays}天`, urgent: false, color: "text-muted-foreground" };
}

// ─── 人数进度条（紧迫感优化版）──────────────────────────────────────────────
function MemberProgress({ 
  current, 
  max, 
  showUrgency = true 
}: { 
  current: number; 
  max: number;
  showUrgency?: boolean;
}) {
  const pct = Math.min((current / max) * 100, 100);
  const remaining = max - current;
  const isFull = current >= max;
  const isUrgent = remaining <= 2 && !isFull;
  const isWarning = remaining <= 3 && !isFull;

  // 根据紧急程度返回不同的颜色配置
  const getUrgencyStyle = () => {
    if (isFull) return {
      text: "text-stone-400 dark:text-stone-500",
      badge: "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400",
      label: "已满员"
    };
    if (isUrgent) return {
      text: "text-red-600",
      badge: "bg-red-50 text-red-600 ring-1 ring-red-200",
      label: `🔥 即将满员 仅剩 ${remaining} 人！`
    };
    if (isWarning) return {
      text: "text-amber-600",
      badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      label: `仅剩 ${remaining} 个名额！`
    };
    return {
      text: "text-amber-600",
      badge: "bg-amber-50/50 text-amber-700",
      label: `还剩 ${remaining} 个名额`
    };
  };

  const style = getUrgencyStyle();

  return (
    <div className="space-y-2">
      {/* 名额状态 - 醒目显示 */}
      {showUrgency && (
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-semibold", style.text)}>
            {isFull ? (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {current}/{max} 人
              </span>
            ) : (
              <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs", style.badge)}>
                {isUrgent && <span className="animate-pulse">🔥</span>}
                {style.label}
              </span>
            )}
          </span>
          {!isFull && (
            <span className="text-xs text-stone-400 dark:text-stone-500">
              {current}/{max}
            </span>
          )}
        </div>
      )}
      
      {/* 进度条 - 根据紧急程度调整高度和颜色 */}
      <div className={cn(
        "bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden",
        isUrgent ? "h-2.5" : "h-2"
      )}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            isUrgent && "animate-pulse"
          )}
          style={{ 
            width: `${pct}%`, 
            background: getProgressGradient(pct),
            boxShadow: isUrgent ? "0 0 8px rgba(239, 68, 68, 0.4)" : undefined
          }}
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
    bgColor: "bg-stone-100 dark:bg-stone-800",
    textColor: "text-stone-500 dark:text-stone-400",
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
    ? DIFFICULTY_CONFIG[location.difficulty as keyof typeof DIFFICULTY_CONFIG]
    : null;
  const leaderName = team.leader?.nickname || team.leader?.name || "领队";
  const gradient = getCardGradient(team.id);

  return (
    <a href={`/teams/${team.id}`} className="group block">
      <article
        className={cn(
          "bg-card rounded-3xl border border-border overflow-hidden",
          "transition-all duration-300",
          "hover:border-amber-200 hover:shadow-2xl hover:shadow-amber-100/40 dark:hover:border-amber-800 dark:hover:shadow-amber-900/20",
          "hover:-translate-y-1.5"
        )}
      >
        {/* ── 顶部封面图（h-40 高度，视觉更舒适）── */}
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
              <Mountain className="h-10 w-10 text-white/40" />
            </div>
          )}

          {/* 底部渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* 浮层徽章：仅显示状态（删除难度徽章避免重复）*/}
          <div className="absolute bottom-3 right-3">
            <StatusBadge status={team.status} />
          </div>
        </div>

        {/* ── 底部内容区（信息层级优化版）── */}
        <div className="p-4">
          {/* 地点名·难度（第一层级：最醒目）*/}
          {location?.name && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">
                {location.name}
                {diff && (
                  <span className="text-muted-foreground font-normal">
                    <span className="mx-1">·</span>
                    {diff.emoji} {diff.label}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* 队伍标题（第二层级）*/}
          <h3 className="font-medium text-stone-700 dark:text-stone-300 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug text-sm mb-2">
            {team.title}
          </h3>

          {/* 日期 + 时间（第三层级：带紧迫感提示）*/}
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-3">
            <span className="flex items-center gap-1 bg-stone-50 dark:bg-stone-800 px-2 py-0.5 rounded-full">
              <Calendar className="h-3 w-3" />
              {team.date}
            </span>
            {team.time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {team.time}
              </span>
            )}
          </div>

          {/* 渐变进度条（第四层级：紧迫感设计）*/}
          <div className="mb-3">
            <MemberProgress current={team.currentMembers} max={team.maxMembers} />
          </div>

          {/* 底部操作区：领队信息 + 操作按钮 */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 min-w-0">
              {team.leader?.avatar ? (
                <img
                  src={team.leader.avatar}
                  alt={leaderName}
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-stone-100 dark:ring-stone-700"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                  <UserCircle className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                </div>
              )}
              <span className="text-xs text-stone-400 dark:text-stone-500 truncate">
                {leaderName}
              </span>
            </div>
            
            {/* 操作按钮组 */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* 查看详情按钮（次要）*/}
              <span className="text-xs text-stone-400 dark:text-stone-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-0.5">
                详情
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </div>
      </article>
    </a>
  );
}

// ─── 骨架屏（上图下文，与新卡片 h-32 对齐）──────────────────────────────────
function TeamSkeleton() {
  return (
    <div className="bg-card rounded-3xl border border-border overflow-hidden">
      {/* 封面图骨架（h-40）*/}
      <div className="skeleton h-40 rounded-none" />
      {/* 内容区骨架 */}
      <div className="p-4 space-y-2.5">
        <div className="skeleton h-4 rounded-full w-3/4" />
        <div className="skeleton h-3.5 rounded-full w-full" />
        <div className="skeleton h-3 rounded-full w-1/2" />
        <div className="skeleton h-2 rounded-full w-full" />
        <div className="flex justify-between items-center pt-1">
          <div className="skeleton h-3.5 rounded-full w-20" />
          <div className="skeleton h-3.5 rounded-full w-12" />
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
        <div className="absolute inset-0 rounded-full bg-stone-100 dark:bg-stone-800/80" />
        <div className="absolute inset-3 rounded-full bg-stone-100 dark:bg-stone-800" />
        <div className="absolute inset-6 rounded-full bg-stone-200 dark:bg-stone-700/60" />
        <Mountain className="relative h-10 w-10 text-stone-400 dark:text-stone-500 z-10" />
      </div>

      <h3 className="text-lg font-semibold text-stone-700 dark:text-stone-300 mb-2">
        {copy.teams.noResults}
      </h3>
      <p className="text-stone-400 dark:text-stone-500 text-sm text-center max-w-xs leading-relaxed mb-6">
        {copy.teams.noResultsTip}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onClear}
          className="px-5 py-2.5 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 text-stone-600 dark:text-stone-400 rounded-full text-sm font-medium transition-colors"
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
              ? "bg-amber-600 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/30"
              : "bg-card text-stone-500 dark:text-stone-400 border border-border hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400"
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
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* ── Header 区域（简化版）── */}
      <section className="relative pt-20 pb-6 border-b border-border bg-card">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 标题行 + 筛选按钮 */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {copy.teams.pageTitle}
              </h1>
              {!isLoading && pagination.total > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                  {pagination.total}
                </span>
              )}
            </div>
            
            {/* 筛选按钮（简化版）*/}
            <button
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              className={cn(
                "flex items-center justify-center w-10 h-10 border rounded-xl transition-all duration-200",
                showFilters || activeFiltersCount > 0
                  ? "bg-amber-50 border-amber-300 text-amber-700 shadow-sm"
                  : "bg-card border-border text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600"
              )}
            >
              <Filter className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* 搜索框（简化placeholder）*/}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="搜索地点或关键词"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="搜索队伍"
              className={cn(
                "w-full pl-12 pr-10 py-3 rounded-xl text-foreground placeholder-muted-foreground",
                "bg-muted border border-border transition-all duration-200",
                "focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="清除搜索"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-stone-400 dark:text-stone-500" />
              </button>
            )}
          </div>

          {/* 筛选面板 */}
          {showFilters && (
            <div className="mt-4 pt-4 pb-1 border-t border-border space-y-4 animate-in slide-in-from-top-2 duration-200">
              {/* 日期范围筛选 */}
              <div>
                <span className="text-sm font-semibold text-stone-600 dark:text-stone-300 mb-2 block flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {copy.filter.dateRange}
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "today", label: copy.filter.dateQuickToday },
                    { key: "tomorrow", label: copy.filter.dateQuickTomorrow },
                    { key: "weekend", label: copy.filter.dateQuickWeekend },
                    { key: "7days", label: copy.filter.dateQuick7Days },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => handleDateQuickSelect(opt.key)}
                      className="px-3 py-1.5 text-xs rounded-full border border-border bg-card text-stone-600 dark:text-stone-400 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                  {(startDate || endDate) && (
                    <button
                      onClick={() => handleDateQuickSelect("clear")}
                      className="px-3 py-1.5 text-xs rounded-full border border-border text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>

              {/* 难度筛选 */}
              <div>
                <span className="text-sm font-semibold text-stone-600 dark:text-stone-300 mb-2 block">
                  {copy.filter.difficulty}
                </span>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTY_OPTIONS.map((opt) => {
                    const isSelected = selectedDifficulty.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleDifficultyToggle(opt.id)}
                        className={cn(
                          "px-3 py-1.5 text-xs rounded-full border transition-all duration-200 active:scale-95",
                          isSelected
                            ? opt.activeColor
                            : "bg-card text-stone-600 dark:text-stone-400 border-border hover:border-stone-300 dark:hover:border-stone-600"
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
                  <span className="text-sm font-semibold text-stone-600 dark:text-stone-300 mb-2 block flex items-center gap-2">
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
                            "px-3 py-1.5 text-xs rounded-full border transition-all duration-200",
                            isSelected
                              ? "bg-amber-100 dark:bg-amber-900/30 border-amber-400 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                              : "bg-card text-stone-600 dark:text-stone-400 border-border hover:border-stone-300 dark:hover:border-stone-600"
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
                  className="text-sm text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors flex items-center gap-1.5"
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
          <div className="mb-6 text-sm text-stone-400 dark:text-stone-500">
            {isLoading ? (
              <span className="inline-block w-40 h-4 bg-stone-200 dark:bg-stone-700 rounded-full animate-pulse" />
            ) : pagination.total > 0 ? (
              <>
                <span className="font-semibold text-stone-700 dark:text-stone-300">
                  {pagination.total}
                </span>
                {/* TODO: 添加到 copy.ts: teams.totalCountV2 */}
                {" "}支队伍向你敞开，随时可以出发
              </>
            ) : null}
          </div>

          {/* 卡片网格（移动端单列，桌面三列）*/}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <TeamSkeleton key={i} />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
          <div className="relative mt-16 text-center rounded-3xl border border-border/80 p-10 overflow-hidden bg-gradient-to-br from-amber-50/60 dark:from-amber-950/20 via-card dark:via-card to-amber-50/40 dark:to-amber-950/10">
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
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-5">
                <Mountain className="h-7 w-7 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                {copy.teams.ctaTitle}
              </h2>
              <p className="text-stone-500 dark:text-stone-400 mb-7 max-w-sm mx-auto leading-relaxed">
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
