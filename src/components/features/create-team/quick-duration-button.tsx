"use client";

interface QuickDurationButtonProps {
  label: string;
  minutes: number;
  currentValue: string;
  onClick: () => void;
}

/**
 * 快速时长选择按钮
 * 用于预设时长选项（如 2h, 4h, 6h 等）
 */
export function QuickDurationButton({
  label,
  minutes,
  currentValue,
  onClick,
}: QuickDurationButtonProps) {
  const isActive = String(minutes) === currentValue;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 border ${
        isActive
          ? "bg-primary/10 border-primary text-primary"
          : "bg-muted border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
