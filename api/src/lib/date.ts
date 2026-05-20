/**
 * 北京时间日期工具
 * 处理 UTC ↔ 北京时间 (UTC+8) 转换，支持快捷筛选选项
 */

export interface DateRange {
  start: Date;   // UTC 时间，用于数据库查询
  end: Date;     // UTC 时间，用于数据库查询
  label: string; // 显示文案
}

export type QuickType = 'today' | 'tomorrow' | 'weekend' | 'next7' | 'next30' | 'custom';

const BEIJING_OFFSET_HOURS = 8;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * UTC 转北京时间（用于显示）
 */
export function toBeijingTime(utcDate: Date): Date {
  return new Date(utcDate.getTime() + BEIJING_OFFSET_HOURS * MS_PER_HOUR);
}

/**
 * 北京时间转 UTC（用于查询）
 */
export function fromBeijingTime(beijingDate: Date): Date {
  return new Date(beijingDate.getTime() - BEIJING_OFFSET_HOURS * MS_PER_HOUR);
}

/**
 * 获取指定北京时间当天的起始和结束（UTC）
 */
function getBeijingDayRange(beijingDate: Date): { start: Date; end: Date } {
  const year = beijingDate.getUTCFullYear();
  const month = beijingDate.getUTCMonth();
  const date = beijingDate.getUTCDate();

  // 北京时间当天 00:00:00
  const beijingStart = new Date(Date.UTC(year, month, date, 0, 0, 0));
  // 北京时间当天 23:59:59.999
  const beijingEnd = new Date(Date.UTC(year, month, date, 23, 59, 59, 999));

  return {
    start: fromBeijingTime(beijingStart),
    end: fromBeijingTime(beijingEnd),
  };
}

/**
 * 获取北京时间的今天范围（UTC）
 */
export function getTodayRange(now: Date = new Date()): DateRange {
  const beijingNow = toBeijingTime(now);
  const range = getBeijingDayRange(beijingNow);

  return {
    ...range,
    label: '今天',
  };
}

/**
 * 获取北京时间的明天范围（UTC）
 */
export function getTomorrowRange(now: Date = new Date()): DateRange {
  const beijingNow = toBeijingTime(now);
  const beijingTomorrow = new Date(beijingNow.getTime() + MS_PER_DAY);
  const range = getBeijingDayRange(beijingTomorrow);

  return {
    ...range,
    label: '明天',
  };
}

/**
 * 获取北京时间的本周末范围（UTC）
 * 周末定义为周六 00:00 - 周日 23:59:59
 */
export function getThisWeekendRange(now: Date = new Date()): DateRange {
  const beijingNow = toBeijingTime(now);
  const dayOfWeek = beijingNow.getUTCDay(); // 0=周日, 1=周一, ..., 6=周六

  // 计算到周六的天数差
  const daysToSaturday = dayOfWeek === 0 ? -1 : 6 - dayOfWeek;

  // 本周六北京时间 00:00
  const beijingSaturday = new Date(beijingNow.getTime() + daysToSaturday * MS_PER_DAY);
  const saturdayStart = new Date(Date.UTC(
    beijingSaturday.getUTCFullYear(),
    beijingSaturday.getUTCMonth(),
    beijingSaturday.getUTCDate(),
    0, 0, 0
  ));

  // 本周日北京时间 23:59:59.999
  const beijingSunday = new Date(saturdayStart.getTime() + MS_PER_DAY);
  const sundayEnd = new Date(Date.UTC(
    beijingSunday.getUTCFullYear(),
    beijingSunday.getUTCMonth(),
    beijingSunday.getUTCDate(),
    23, 59, 59, 999
  ));

  return {
    start: fromBeijingTime(saturdayStart),
    end: fromBeijingTime(sundayEnd),
    label: '本周末',
  };
}

/**
 * 获取未来7天范围（UTC）
 * 从今天开始，包含今天，共7天
 */
export function getNext7DaysRange(now: Date = new Date()): DateRange {
  const today = getTodayRange(now);
  const beijingEnd = new Date(toBeijingTime(today.start).getTime() + 6 * MS_PER_DAY);
  const endRange = getBeijingDayRange(beijingEnd);

  return {
    start: today.start,
    end: endRange.end,
    label: '未来7天',
  };
}

/**
 * 获取未来30天范围（UTC）
 * 从今天开始，包含今天，共30天
 */
export function getNext30DaysRange(now: Date = new Date()): DateRange {
  const today = getTodayRange(now);
  const beijingEnd = new Date(toBeijingTime(today.start).getTime() + 29 * MS_PER_DAY);
  const endRange = getBeijingDayRange(beijingEnd);

  return {
    start: today.start,
    end: endRange.end,
    label: '未来30天',
  };
}

/**
 * 判断某 UTC 时间是否在北京时间的周末
 */
export function isInBeijingWeekend(utcDate: Date): boolean {
  const beijingDate = toBeijingTime(utcDate);
  const dayOfWeek = beijingDate.getUTCDay(); // 0=周日, 6=周六
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * 根据日期范围反推高亮哪个快捷按钮
 * 返回匹配的 quickType，如果没有完全匹配的返回 'custom'
 */
export function getActiveQuickType(start: Date, end: Date, now: Date = new Date()): QuickType {
  const today = getTodayRange(now);
  const tomorrow = getTomorrowRange(now);
  const weekend = getThisWeekendRange(now);
  const next7 = getNext7DaysRange(now);
  const next30 = getNext30DaysRange(now);

  // 使用毫秒时间戳比较，避免浮点误差
  const isMatch = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) < 1000;

  if (isMatch(start, today.start) && isMatch(end, today.end)) return 'today';
  if (isMatch(start, tomorrow.start) && isMatch(end, tomorrow.end)) return 'tomorrow';
  if (isMatch(start, weekend.start) && isMatch(end, weekend.end)) return 'weekend';
  if (isMatch(start, next7.start) && isMatch(end, next7.end)) return 'next7';
  if (isMatch(start, next30.start) && isMatch(end, next30.end)) return 'next30';

  return 'custom';
}
