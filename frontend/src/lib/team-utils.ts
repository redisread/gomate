import type { Team } from "@/lib/types";

/**
 * 获取队伍状态信息
 * @param status - 队伍状态
 * @param current - 当前成员数
 * @param max - 最大成员数
 */
export function getStatusInfo(
  status: string,
  current: number,
  max: number
): {
  label: string;
  className: string;
  icon?: string;
} {
  if (status === "recruiting" && current < max) {
    return {
      label: "招募中",
      className:
        "bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 border border-emerald-300/50",
      icon: "🔥",
    };
  }
  if (status === "full" || (status === "recruiting" && current >= max)) {
    return {
      label: "已满员",
      className:
        "bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border border-amber-300/50",
      icon: "✓",
    };
  }
  if (status === "formed") {
    return {
      label: "已组建",
      className:
        "bg-gradient-to-r from-violet-100 to-violet-50 text-violet-700 border border-violet-300/50",
      icon: "🚀",
    };
  }
  if (status === "completed") {
    return {
      label: "已完成",
      className:
        "bg-gradient-to-r from-stone-100 to-stone-50 text-stone-500 border border-stone-200",
      icon: "🎉",
    };
  }
  if (status === "cancelled") {
    return {
      label: "已取消",
      className:
        "bg-gradient-to-r from-red-100 to-red-50 text-red-600 border border-red-300/50",
      icon: "✗",
    };
  }
  return {
    label: "招募中",
    className:
      "bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 border border-emerald-300/50",
  };
}

/**
 * 获取队伍关闭状态消息
 */
export function getClosedMessage(team: Team): string {
  if (team.status === "completed") return "活动已结束";
  if (team.status === "cancelled") return "队伍已取消";
  if (team.currentMembers >= team.maxMembers) return "名额已满";
  return "活动已结束";
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

/**
 * 获取队伍进度故事文案
 */
export function getProgressStory(ratio: number): string {
  if (ratio >= 100) return "队伍集结完毕，准备出发！";
  if (ratio >= 75) return "即将满员，抓紧最后的机会";
  if (ratio >= 50) return "已经过半，离出发越来越近了";
  if (ratio >= 25) return "队伍初具规模，正在吸引更多伙伴";
  return "";
}

/**
 * 获取队伍故事叙述
 */
export function getTeamStory(current: number, max: number): string {
  const ratio = (current / max) * 100;
  if (ratio >= 100) return "队伍已集结完毕，即将开启这段旅程";
  if (ratio >= 75) return `队伍已经准备好了！${current} 位伙伴都在等你`;
  if (ratio >= 25) return `队伍正在成型中，${current} 位伙伴已经确认参加`;
  return "这支队伍刚刚启航，队长正在等待第一批志同道合的伙伴";
}

/**
 * 判断用户是否可以加入队伍
 */
export function canUserJoinTeam(params: {
  isLeader: boolean;
  isMember: boolean;
  isPending: boolean;
  teamStatus: string;
  currentMembers: number;
  maxMembers: number;
}): boolean {
  const { isLeader, isMember, isPending, teamStatus, currentMembers, maxMembers } =
    params;

  return (
    !isLeader &&
    !isMember &&
    !isPending &&
    teamStatus === "recruiting" &&
    currentMembers < maxMembers
  );
}

/**
 * 获取队伍行动状态
 */
export function getActionState(
  isLeader: boolean,
  isMember: boolean,
  isPending: boolean,
  canJoin: boolean
): "leader" | "member" | "pending" | "canJoin" | "closed" {
  if (isLeader) return "leader";
  if (isMember) return "member";
  if (isPending) return "pending";
  if (canJoin) return "canJoin";
  return "closed";
}

/**
 * 生成随机颜文字（用于头像占位）
 */
export function getRandomKaomoji(): string {
  const kaomoji = ["◡‿◡", "˘◡˘", "◠‿◠", "◕‿◕", "◉‿◉"];
  return kaomoji[Math.floor(Math.random() * kaomoji.length)];
}

/**
 * 计算队伍进度百分比
 */
export function calculateTeamProgress(
  current: number,
  max: number
): { ratio: number; remaining: number; isFull: boolean } {
  const ratio = max > 0 ? Math.round((current / max) * 100) : 0;
  const remaining = max - current;
  const isFull = current >= max;

  return { ratio, remaining, isFull };
}