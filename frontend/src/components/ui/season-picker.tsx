"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// SeasonPicker
// ─────────────────────────────────────────────

interface SeasonConfig {
  key: string;
  emoji: string;
  label: string;
  months: string;
  selected: {
    border: string;
    bg: string;
    badge: string;
  };
}

const SEASONS: SeasonConfig[] = [
  {
    key: "spring",
    emoji: "🌸",
    label: "春季",
    months: "3-5月",
    selected: {
      border: "border-pink-300",
      bg: "bg-pink-50",
      badge: "bg-pink-300",
    },
  },
  {
    key: "summer",
    emoji: "☀️",
    label: "夏季",
    months: "6-8月",
    selected: {
      border: "border-orange-300",
      bg: "bg-orange-50",
      badge: "bg-orange-300",
    },
  },
  {
    key: "autumn",
    emoji: "🍂",
    label: "秋季",
    months: "9-11月",
    selected: {
      border: "border-amber-400",
      bg: "bg-amber-50",
      badge: "bg-amber-400",
    },
  },
  {
    key: "winter",
    emoji: "❄️",
    label: "冬季",
    months: "12-2月",
    selected: {
      border: "border-sky-300",
      bg: "bg-sky-50",
      badge: "bg-sky-300",
    },
  },
];

interface SeasonPickerProps {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}

/** 季节多选卡片组件 */
export function SeasonPicker({ value, onChange, disabled = false }: SeasonPickerProps) {
  const toggle = (key: string) => {
    if (disabled) return;
    const next = value.includes(key)
      ? value.filter((s) => s !== key)
      : [...value, key];
    onChange(next);
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {SEASONS.map((season) => {
        const isSelected = value.includes(season.key);

        return (
          <button
            key={season.key}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => toggle(season.key)}
            className={cn(
              // 基础样式
              "relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center",
              "transition-all duration-150 select-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2",
              // 未选中
              !isSelected && "border-gray-200 bg-white hover:scale-[1.03] hover:border-gray-300",
              // 选中
              isSelected && [season.selected.border, season.selected.bg],
              // 点击缩放反馈
              "active:scale-95",
              // 禁用
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {/* 右上角勾号徽章 */}
            {isSelected && (
              <span
                className={cn(
                  "absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full",
                  season.selected.badge,
                )}
              >
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </span>
            )}

            {/* 大 emoji */}
            <span className="text-2xl leading-none" aria-hidden="true">
              {season.emoji}
            </span>

            {/* 季节名 */}
            <span className="text-sm font-semibold text-gray-800">{season.label}</span>

            {/* 月份 */}
            <span className="text-xs text-gray-400">{season.months}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// EditProgressBar
// ─────────────────────────────────────────────

interface Step {
  id: string;
  label: string;
  done: boolean;
}

interface EditProgressBarProps {
  steps: Step[];
  className?: string;
}

/** 编辑流程进度条组件 */
export function EditProgressBar({ steps, className }: EditProgressBarProps) {
  // 第一个未完成步骤的索引即为「当前步骤」
  const currentIndex = steps.findIndex((s) => !s.done);

  return (
    <div className={cn("flex items-start", className)}>
      {steps.map((step, index) => {
        const isDone = step.done;
        const isCurrent = index === currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex flex-1 flex-col items-center">
            {/* 圆圈 + 连接线行 */}
            <div className="flex w-full items-center">
              {/* 左侧连接线（首步骤不显示） */}
              {index > 0 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors duration-300",
                    steps[index - 1].done ? "bg-amber-400" : "bg-gray-200",
                  )}
                />
              )}

              {/* 步骤圆圈 */}
              <div
                className={cn(
                  "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                  isDone && "border-amber-400 bg-amber-400 text-white",
                  isCurrent && "border-amber-400 bg-white text-amber-500 animate-pulse",
                  !isDone && !isCurrent && "border-gray-300 bg-white text-gray-400",
                )}
              >
                {isDone ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* 右侧连接线（末步骤不显示） */}
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors duration-300",
                    isDone ? "bg-amber-400" : "bg-gray-200",
                  )}
                />
              )}
            </div>

            {/* 步骤标签（手机端隐藏） */}
            <span
              className={cn(
                "mt-1.5 hidden text-center text-xs sm:block",
                isDone && "font-medium text-amber-500",
                isCurrent && "font-semibold text-amber-600",
                !isDone && !isCurrent && "text-gray-400",
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
