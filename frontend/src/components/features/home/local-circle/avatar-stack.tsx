/**
 * P0-D T2 (task #176) — 头像堆叠（URL 数组版，T2/T3 共用）
 *
 * spec: notes/gomate-p0d-local-circle-spec-v1.2.md §6.2
 *   - 最大 5 个头像，超过显示「+N」
 *   - sm=24px / md=32px；堆叠间隔 -8px（重叠 1/3）
 *   - tooltip「过去 7 天参与过此地点行动」（由消费方传 title）
 *
 * 与 home-team-card 的 AvatarStack（member 对象版）区分：
 * 本组件接受 avatar URL 数组（来自 local-circle API 的 avatarStack / neighborAvatars）。
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
  const fontSize = size === "sm" ? "text-[9px]" : "text-[10px]";

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
                className={`w-full h-full flex items-center justify-center ${fontSize} font-bold text-white`}
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
            className={`${boxSize} rounded-full border-2 border-border flex items-center justify-center ${fontSize} font-bold flex-shrink-0`}
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
