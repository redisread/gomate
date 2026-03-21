import * as React from "react";
import { Calendar, Clock, Users, MapPin, Heart, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";
import type { Team } from "@/lib/types";
import { StatusBadge, DifficultyBadge } from "@/components/ui/status-badge";

/* ============================================================
   TeamCard — 队伍卡片组件（Design System v2.0）
   设计特点：
   - 上方封面图（location.coverImage 或渐变占位）
   - 玻璃态卡片背景
   - hover：translateY(-4px) + 品牌绿光晕阴影，250ms
   - 收藏按钮：点击后 heartbeat 弹跳动画
   - 左侧状态色条（快速视觉扫描）
   - 成员头像叠加（最多 4 个）+ 进度条
   ============================================================ */

interface TeamCardProps {
  team: Team;
  /** 是否初始已收藏 */
  isFavorited?: boolean;
  /** 收藏回调（返回新状态） */
  onFavorite?: (teamId: string, next: boolean) => void;
  /** 卡片点击跳转 */
  onClick?: () => void;
  /** stagger 列表序号（0-5），控制出现延迟 */
  index?: number;
  className?: string;
}

export function TeamCard({
  team,
  isFavorited = false,
  onFavorite,
  onClick,
  index = 0,
  className,
}: TeamCardProps) {
  const [favorited, setFavorited] = React.useState(isFavorited);
  // heartbeat 动画触发标志
  const [heartAnim, setHeartAnim] = React.useState(false);

  const leaderName   = team.leader.nickname || team.leader.name;
  const locationName = team.location?.name ?? "";
  const coverImage   = team.location?.coverImage;
  const approvedMembers = (team.members ?? []).filter((m) => m.status === "approved");
  const visibleMembers  = approvedMembers.slice(0, 4);
  const extraCount      = Math.max(0, team.currentMembers - 1 - visibleMembers.length);
  const fillRatio       = Math.min(1, team.currentMembers / team.maxMembers);
  const isFull          = team.currentMembers >= team.maxMembers;

  // 格式化日期
  const formattedDate = React.useMemo(() => {
    try {
      return new Date(team.date).toLocaleDateString("zh-CN", {
        month: "short",
        day:   "numeric",
        weekday: "short",
      });
    } catch {
      return team.date;
    }
  }, [team.date]);

  /** 收藏点击：先触发 heartbeat 动画，再更新状态 */
  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();  // 阻止冒泡到卡片 onClick
    const next = !favorited;
    setFavorited(next);
    setHeartAnim(true);
    onFavorite?.(team.id, next);
  };

  // stagger delay class
  const staggerClass = index < 6 ? `stagger-${index + 1}` : "";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className={cn(
        // 卡片基础：玻璃态 + 圆角 + 阴影
        "group relative flex flex-col overflow-hidden",
        "card-interactive",
        // 出现动画
        "animate-fade-up opacity-0",
        staggerClass,
        // 焦点可访问性
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249a87]",
        className
      )}
    >
      {/* ---- 封面图区域 ---- */}
      <CoverImage src={coverImage} alt={team.title} status={team.status} />

      {/* ---- 收藏按钮（浮在封面右上角） ---- */}
      <button
        type="button"
        aria-label={favorited ? "取消收藏" : "收藏队伍"}
        onClick={handleFavorite}
        onAnimationEnd={() => setHeartAnim(false)}
        className={cn(
          "absolute top-3 right-3 z-10",
          "w-8 h-8 rounded-full flex items-center justify-center",
          "bg-white/80 backdrop-blur-sm shadow-sm",
          "transition-colors duration-150",
          favorited
            ? "text-[#ff7a65]"
            : "text-neutral-400 hover:text-[#ff7a65]",
          // heartbeat 动画：点击时触发，结束后清除
          heartAnim && "animate-[heartbeat_0.3s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
        )}
      >
        <Heart
          className="h-4 w-4"
          fill={favorited ? "currentColor" : "none"}
          strokeWidth={2}
        />
      </button>

      {/* ---- 卡片内容区 ---- */}
      <div className="flex flex-col gap-3 p-4 flex-1">

        {/* 顶部：状态 + 难度徽章 */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={team.status} />
          {team.route?.difficulty && (
            <DifficultyBadge difficulty={team.route.difficulty} />
          )}
          {team.icon && (
            <span className="ml-auto text-xl leading-none select-none" aria-hidden="true">
              {team.icon}
            </span>
          )}
        </div>

        {/* 队伍标题 */}
        <div>
          <h3 className="text-base font-semibold text-[#1e1812] leading-snug line-clamp-2 group-hover:text-[#249a87] transition-colors duration-150">
            {team.title}
          </h3>
          {locationName && (
            <div className="flex items-center gap-1 mt-1 text-xs text-[#8f7f6e]">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{locationName}</span>
            </div>
          )}
        </div>

        {/* 关键信息 */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} text={formattedDate} />
          <InfoRow icon={<Clock className="h-3.5 w-3.5" />}    text={team.time} />
          <InfoRow
            icon={<Users className="h-3.5 w-3.5" />}
            text={`${team.currentMembers} / ${team.maxMembers} ${copy.common.person}`}
            accent={isFull}
          />
          {team.duration && (
            <InfoRow icon={<Clock className="h-3.5 w-3.5 opacity-0" />} text={team.duration} />
          )}
        </div>

        {/* 人数进度条 */}
        <div className="h-1.5 bg-[#f2ede7] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${fillRatio * 100}%`,
              background: isFull ? "#d97706" : "#249a87",
            }}
          />
        </div>

        {/* 底部：队长 + 成员头像 + 箭头 */}
        <div className="flex items-center justify-between mt-auto pt-1">
          {/* 队长信息 */}
          <div className="flex items-center gap-2">
            <Avatar src={team.leader.avatar} name={leaderName} size="sm" />
            <span className="text-xs text-[#8f7f6e]">
              <span className="text-[#1e1812] font-medium">{leaderName}</span>
              {" "}发起
            </span>
          </div>

          {/* 其余成员头像叠加 + 箭头 */}
          <div className="flex items-center gap-2">
            {visibleMembers.length > 0 && (
              <div className="flex -space-x-2">
                {visibleMembers.map((m, i) => (
                  <Avatar
                    key={m.id}
                    src={m.avatar}
                    name={m.nickname || m.name}
                    size="xs"
                    style={{ zIndex: visibleMembers.length - i }}
                  />
                ))}
                {extraCount > 0 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f2ede7] text-[10px] font-medium text-[#8f7f6e] ring-2 ring-white">
                    +{extraCount}
                  </span>
                )}
              </div>
            )}
            <ChevronRight className="h-4 w-4 text-[#8f7f6e]/50 group-hover:text-[#249a87] group-hover:translate-x-0.5 transition-all duration-150" />
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---- 封面图区域（含渐变占位） ---- */
interface CoverImageProps {
  src?: string;
  alt: string;
  status: Team["status"];
}

function CoverImage({ src, alt, status }: CoverImageProps) {
  // 无封面时根据状态展示品牌渐变占位
  if (!src) {
    return (
      <div
        className="h-36 w-full flex items-center justify-center shrink-0"
        style={{
          background: status === "completed" || status === "cancelled"
            ? "linear-gradient(160deg, #f2ede7 0%, #e8e0d7 100%)"
            : "linear-gradient(160deg, #1a6459 0%, #249a87 40%, #3fb5a0 70%, #74d0bf 100%)",
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="h-40 w-full overflow-hidden shrink-0">
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
    </div>
  );
}

/* ---- 信息行 ---- */
interface InfoRowProps {
  icon: React.ReactNode;
  text: string;
  accent?: boolean;
}

function InfoRow({ icon, text, accent }: InfoRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs",
        accent ? "font-medium" : ""
      )}
      style={{ color: accent ? "#d97706" : "#8f7f6e" }}
    >
      <span className="shrink-0 opacity-60">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

/* ============================================================
   Avatar — 用户头像（可复用）
   ============================================================ */
interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  style?: React.CSSProperties;
}

export function Avatar({ src, name, size = "sm", className, style }: AvatarProps) {
  const sizeClass = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
  }[size];

  // 中文取首字，英文取首字母
  const initials = name
    ? /[\u4e00-\u9fa5]/.test(name[0]) ? name[0] : name[0].toUpperCase()
    : "?";

  // 根据姓名哈希生成一致背景色（使用品牌蓝绿色域 hue 150~220）
  const hue = (name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 60) + 155;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={cn(
          "rounded-full object-cover shrink-0 ring-2 ring-white",
          sizeClass,
          className
        )}
        style={style}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center shrink-0",
        "font-semibold text-white select-none ring-2 ring-white",
        sizeClass,
        className
      )}
      style={{ background: `hsl(${hue}, 45%, 42%)`, ...style }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
