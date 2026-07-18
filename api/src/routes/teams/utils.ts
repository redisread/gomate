/** 随机队伍图标 */
export const TEAM_ICONS = ["⛰️", "🥾", "🌲", "🏕️", "🧗", "🌄", "🏞️", "🗺️"];

export function getRandomTeamIcon() {
  return TEAM_ICONS[Math.floor(Math.random() * TEAM_ICONS.length)];
}

/**
 * 获取时间快捷筛选的日期范围（北京时间）
 */
export function getTimeFilterRange(timeFilter: string): { start: string; end: string } | null {
  const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
  const now = new Date();
  const beijingNow = new Date(now.getTime() + BEIJING_OFFSET_MS);
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  switch (timeFilter) {
    case "today": {
      const dateStr = formatDate(beijingNow);
      return { start: dateStr, end: dateStr };
    }
    case "tomorrow": {
      const tomorrow = new Date(beijingNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = formatDate(tomorrow);
      return { start: dateStr, end: dateStr };
    }
    case "weekend": {
      const dayOfWeek = beijingNow.getUTCDay();
      const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
      const saturday = new Date(beijingNow);
      saturday.setDate(beijingNow.getDate() + daysUntilSaturday);
      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);
      return { start: formatDate(saturday), end: formatDate(sunday) };
    }
    case "7days": {
      const start = formatDate(beijingNow);
      const endDate = new Date(beijingNow);
      endDate.setDate(endDate.getDate() + 7);
      return { start, end: formatDate(endDate) };
    }
    default:
      return null;
  }
}

/**
 * 安全解析 requirements 字段
 * 旧数据可能是非 JSON 字符串，解析失败返回空数组
 */
export function parseRequirements(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
