"use client";

import * as React from "react";
import { X } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface Tag {
  id?: string;
  name: string;
  type?: string;
  count?: number;
}

interface TagFilterBarProps {
  tags: Tag[];
  selectedTag: string | null;
  onTagSelect: (tagName: string | null) => void;
  className?: string;
}

/**
 * 标签筛选栏组件
 * - 横向滚动标签列表
 * - 选中状态 + 清除按钮
 * - URL 状态同步（通过父组件）
 */
export function TagFilterBar({ tags, selectedTag, onTagSelect, className }: TagFilterBarProps) {
  const { t } = useI18n(["content", "common"]);

  if (tags.length === 0) return null;

  return (
    <div className={className}>
      {/* 横向滚动标签 */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
        {tags.map((tag) => (
          <button
            key={tag.id ?? tag.name}
            onClick={() => onTagSelect(tag.name === selectedTag ? null : tag.name)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
              selectedTag === tag.name
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            #{tag.name}
            {typeof tag.count === "number" && (
              <span className="ml-1 opacity-60">{tag.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* 选中状态 Chip */}
      {selectedTag && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-muted-foreground">{t("content.discover.filterLabel") || "筛选:"}</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            #{selectedTag}
            <button
              onClick={() => onTagSelect(null)}
              className="ml-1 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
              aria-label={t("common.clearAll") || "清除筛选"}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
