"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * task #166（P0-A T3）：chip-input 通用组件
 *
 * 场景：Team「行动本」编辑页装备/分工的多值输入；未来 story 编辑页 tags 也可复用。
 * 键盘无障碍：Enter / , / 空格 提交当前输入；Backspace 空输入时删末项。
 * server 侧仍会去重（防绕过前端），前端提交前也去重。
 *
 * spec：notes/gomate-p0a-team-actionbook-spec.md §5
 */
export interface ChipInputProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** 单项最大长度（超过后 onKeyDown 拒收） */
  maxItemLength?: number;
  /** 最大项数（达到后停止追加） */
  maxItems?: number;
  /** 是否允许「,」触发提交（zh 常见输入错发） */
  splitOnComma?: boolean;
  /** 是否允许空格触发提交（默认关，装备清单里「登山鞋 中筒」是合法项） */
  splitOnSpace?: boolean;
  /** 由外层控制的 aria-label（i18n 文案，避免组件内绑定 ns） */
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  chipClassName?: string;
  inputClassName?: string;
  /** data 属性透传，便于 e2e 定位 */
  "data-testid"?: string;
}

const DEFAULT_MAX_ITEM = 50;
const DEFAULT_MAX_ITEMS = 50;

export function ChipInput({
  values,
  onChange,
  placeholder,
  maxItemLength = DEFAULT_MAX_ITEM,
  maxItems = DEFAULT_MAX_ITEMS,
  splitOnComma = true,
  splitOnSpace = false,
  ariaLabel,
  disabled = false,
  className,
  chipClassName,
  inputClassName,
  "data-testid": testId,
}: ChipInputProps) {
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const commitDraft = React.useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      if (values.length >= maxItems) return;
      // 去重（保留原始大小写，只比对完全相等）
      if (values.includes(trimmed)) {
        setDraft("");
        return;
      }
      onChange([...values, trimmed]);
      setDraft("");
    },
    [values, onChange, maxItems],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      const isEnter = e.key === "Enter";
      const isComma = splitOnComma && (e.key === "," || e.key === "，");
      const isSpace = splitOnSpace && e.key === " ";
      if (isEnter || isComma || isSpace) {
        e.preventDefault();
        commitDraft(draft);
        return;
      }
      if (e.key === "Backspace" && draft === "" && values.length > 0) {
        e.preventDefault();
        onChange(values.slice(0, -1));
      }
    },
    [draft, values, onChange, commitDraft, disabled, splitOnComma, splitOnSpace],
  );

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v.length > maxItemLength) return; // 阻止超长（贴入长文本）
      setDraft(v);
    },
    [maxItemLength],
  );

  const handleBlur = React.useCallback(() => {
    // 失焦时如有残余 draft 视为一个 chip 提交（对齐 zh 用户填完不按回车的直觉）
    if (draft.trim()) commitDraft(draft);
  }, [draft, commitDraft]);

  const removeAt = React.useCallback(
    (idx: number) => {
      if (disabled) return;
      onChange(values.filter((_, i) => i !== idx));
    },
    [values, onChange, disabled],
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-xl border bg-muted px-3 py-2.5",
        "focus-within:border-primary focus-within:bg-card focus-within:ring-3 focus-within:ring-primary/10",
        "transition-all duration-200",
        disabled && "opacity-60 pointer-events-none",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
      data-testid={testId}
    >
      {values.map((v, i) => (
        <span
          key={`${v}-${i}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs px-2.5 py-1 font-medium",
            chipClassName,
          )}
        >
          {v}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeAt(i);
            }}
            aria-label={`remove ${v}`}
            className="text-amber-600 dark:text-amber-400 hover:text-red-600 dark:hover:text-red-400 leading-none"
            tabIndex={-1}
          >
            ✕
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={values.length === 0 ? placeholder : ""}
        aria-label={ariaLabel}
        disabled={disabled || values.length >= maxItems}
        className={cn(
          "flex-1 min-w-[8ch] bg-transparent border-none outline-none text-sm",
          "placeholder:text-muted-foreground",
          inputClassName,
        )}
      />
    </div>
  );
}

// 单独导出常量供测试引用
export const CHIP_INPUT_LIMITS = {
  maxItem: DEFAULT_MAX_ITEM,
  maxItems: DEFAULT_MAX_ITEMS,
};
