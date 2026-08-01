"use client";

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
}

/**
 * 圆形进度条组件
 * 用于上传进度显示
 */
export function CircularProgress({ progress, size = 56, strokeWidth = 4 }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* 背景圆 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted-foreground/20"
      />
      {/* 进度圆 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-primary transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-300 ease-out"
      />
      {/* 百分比文字 */}
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium text-foreground transform rotate-90 origin-center"
      >
        {Math.round(progress)}%
      </text>
    </svg>
  );
}
