"use client";

import * as React from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { Team } from "@/lib/types";

interface ActivityCalendarProps {
  organizerId: string;
  teams: Team[];
}

interface DayInfo {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  teams: Team[];
}

/**
 * 活动日历组件
 * 展示主办人的全部活动，高亮有活动的日期
 */
export function ActivityCalendar({ organizerId: _organizerId, teams }: ActivityCalendarProps) {
  const { t: _t } = useI18n(["teams", "common"]);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  // 生成日历数据
  const calendarDays = React.useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 本月第一天
    const firstDay = new Date(year, month, 1);
    // 本月最后一天
    const lastDay = new Date(year, month + 1, 0);

    // 获取本月第一天是周几（0=周日，1=周一...）
    const startDayOfWeek = firstDay.getDay();

    // 生成日历网格
    const days: DayInfo[] = [];

    // 添加上个月的日期（补齐第一行）
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        day: date.getDate(),
        isCurrentMonth: false,
        isToday: isSameDay(date, new Date()),
        teams: getTeamsForDate(date, teams),
      });
    }

    // 添加本月的日期
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        day: i,
        isCurrentMonth: true,
        isToday: isSameDay(date, new Date()),
        teams: getTeamsForDate(date, teams),
      });
    }

    // 添加下个月的日期（补齐最后一行）
    const remainingDays = 42 - days.length; // 6 行 × 7 天
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        day: date.getDate(),
        isCurrentMonth: false,
        isToday: isSameDay(date, new Date()),
        teams: getTeamsForDate(date, teams),
      });
    }

    return days;
  }, [currentDate, teams]);

  // 选中日期的活动
  const selectedDateTeams = React.useMemo(() => {
    if (!selectedDate) return [];
    return getTeamsForDate(selectedDate, teams);
  }, [selectedDate, teams]);

  // 上个月
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  // 下个月
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  // 格式化日期
  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  };

  // 星期标题
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* 日历头部 */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          aria-label="上个月"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold text-foreground">
          {formatDate(currentDate)}
        </h3>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          aria-label="下个月"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => (
          <button
            key={index}
            onClick={() => setSelectedDate(day.isCurrentMonth ? day.date : null)}
            className={`
              relative flex flex-col items-center justify-center min-h-[72px] p-1
              transition-colors duration-150
              ${day.isCurrentMonth ? "text-foreground" : "text-muted-foreground/40"}
              ${day.isToday ? "bg-primary/5" : ""}
              ${day.teams.length > 0 ? "cursor-pointer hover:bg-accent" : "cursor-default"}
              ${selectedDate && isSameDay(day.date, selectedDate) ? "bg-accent" : ""}
            `}
          >
            {/* 日期数字 */}
            <span className={`
              text-sm font-medium
              ${day.isToday ? "text-primary font-bold" : ""}
            `}>
              {day.day}
            </span>

            {/* 活动指示器 */}
            {day.teams.length > 0 && (
              <div className="flex gap-0.5 mt-1">
                {day.teams.slice(0, 3).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                  />
                ))}
                {day.teams.length > 3 && (
                  <span className="text-[10px] text-primary ml-0.5">+{day.teams.length - 3}</span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* 选中日期的活动详情 */}
      {selectedDate && selectedDateTeams.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日的活动
          </h4>
          <div className="space-y-2">
            {selectedDateTeams.map((team) => (
              <a
                key={team.id}
                href={`/teams/${team.id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {team.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {team.location?.name || "待定"}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 辅助函数：判断两个日期是否是同一天
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// 辅助函数：获取指定日期的活动
function getTeamsForDate(date: Date, teams: Team[]): Team[] {
  return teams.filter((team) => {
    if (!team.startTime) return false;
    const teamDate = new Date(team.startTime);
    return isSameDay(teamDate, date);
  });
}
