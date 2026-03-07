"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

interface TagSelectorProps {
  value: string[]; // 已选中的标签 ID 数组
  onChange: (tagIds: string[]) => void;
  availableTags: Array<{ id: string; name: string }>; // 可选的标签列表
  entityType: "location" | "route" | "activity";
  placeholder?: string;
}

export function TagSelector({
  value,
  onChange,
  availableTags,
  entityType,
  placeholder = copy.admin.addTagPlaceholder,
}: TagSelectorProps) {
  const [newTagName, setNewTagName] = React.useState("");
  const [localAvailableTags, setLocalAvailableTags] = React.useState(availableTags);

  // 当外部 availableTags 变化时更新本地状态
  React.useEffect(() => {
    setLocalAvailableTags(availableTags);
  }, [availableTags]);

  // 切换预设标签
  const handleToggleTag = (tagId: string) => {
    if (value.includes(tagId)) {
      onChange(value.filter((id) => id !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  };

  // 创建并添加新标签
  const handleCreateTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    // 检查是否已存在同名标签
    const existing = localAvailableTags.find(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      if (!value.includes(existing.id)) {
        onChange([...value, existing.id]);
      }
      setNewTagName("");
      return;
    }

    // 创建新标签
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, type: entityType }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // 添加到可用列表并选中
          const newTag = { id: data.tagId, name: trimmed };
          setLocalAvailableTags((prev) => [...prev, newTag]);
          onChange([...value, data.tagId]);
          setNewTagName("");
        }
      } else {
        console.error("创建标签失败");
      }
    } catch (error) {
      console.error("创建标签请求失败:", error);
    }
  };

  // 移除已选标签
  const handleRemove = (tagId: string) => {
    onChange(value.filter((id) => id !== tagId));
  };

  // 获取已选标签的名称映射
  const selectedTags = value
    .map((id) => localAvailableTags.find((t) => t.id === id))
    .filter((tag): tag is { id: string; name: string } => tag !== undefined);

  return (
    <div className="space-y-3">
      {/* 可选标签区域 */}
      {localAvailableTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-stone-500">{copy.ui.tagSelector.presetLabel}</p>
          <div className="flex flex-wrap gap-2">
            {localAvailableTags.map((tag) => {
              const isSelected = value.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleToggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    isSelected
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 新建标签输入 */}
      <div className="space-y-2">
        <p className="text-sm text-stone-500">{copy.ui.tagSelector.customLabel}</p>
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateTag();
              }
            }}
            className="border-stone-200"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleCreateTag}
            disabled={!newTagName.trim()}
            className="border-stone-200"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 已选择标签 */}
      {selectedTags.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-stone-500">{copy.ui.tagSelector.selectedLabel}</p>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="bg-stone-100 text-stone-700 hover:bg-stone-200 px-3 py-1"
              >
                {tag.name}
                <button
                  type="button"
                  onClick={() => handleRemove(tag.id)}
                  className="ml-2 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-sm text-stone-400 italic">{copy.admin.noTagsSelected}</div>
      )}
    </div>
  );
}
