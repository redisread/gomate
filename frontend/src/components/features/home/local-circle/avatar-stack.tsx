/**
 * 邻近队伍头像堆叠（URL 数组版）。
 *
 *   - 最大 5 个头像，超过显示「+N」
 *   - sm=24px / md=32px；堆叠间隔 -8px（重叠 1/3）
 * 与队伍卡片中的 AvatarStack（member 对象版）区分：
 * 本组件接受 local-circle 个性化 neighborAvatars URL 数组。
 */

import * as React from "react";

interface AvatarStackProps {
  /** 头像 URL 数组（API 返回，可能含空串占位） */
  urls: string[];
  /** 最多显示几个，默认 5 */
  max?: number;
  /** 尺寸 sm=24px / md=32px */
  size?: "sm" | "md";
  /** hover tooltip 文案 */
  tooltip?: string;
}

const SIZE_PX: Record<NonNullable<AvatarStackProps["size"]>, string> = {
  sm: "w-6 h-6", // 24px
  md: "w-8 h-8", // 32px
};

export function AvatarStack({ urls, max = 5, size = "sm", tooltip }: AvatarStackProps) {
  const shown = urls.slice(0, max);
  const extra = Math.max(0, urls.length - max);
  const boxSize = SIZE_PX[size];

  if (urls.length === 0) return null;

  return (
    <div className="flex items-center" title={tooltip}>
      <div className="flex -space-x-2">
        {shown.map((url, idx) => (
          <div
            key={idx}
            className={`${boxSize} rounded-full border-2 border-border overflow-hidden flex-shrink-0`}
            style={{ zIndex: max + 1 - idx, boxShadow: "var(--shadow-warm-sm)" }}
          >
            {url ? (
              <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center text-3xs font-bold text-white`}
                style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-300) 100%)" }}
                aria-hidden="true"
              >
                ·
              </div>
            )}
          </div>
        ))}
        {extra > 0 && (
          <div
            className={`${boxSize} rounded-full border-2 border-border flex items-center justify-center text-3xs font-bold flex-shrink-0`}
            style={{
              zIndex: 1,
              background: "var(--brand-subtle)",
              color: "var(--accent-foreground)",
              boxShadow: "var(--shadow-warm-sm)",
            }}
          >
            +{extra}
          </div>
        )}
      </div>
    </div>
  );
}
