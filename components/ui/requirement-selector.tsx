"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { REQUIREMENT_PRESETS } from "@/lib/constants";

interface RequirementSelectorProps {
  value: string[];
  onChange: (requirements: string[]) => void;
  placeholder?: string;
}

export function RequirementSelector({
  value,
  onChange,
  placeholder = "输入其他要求...",
}: RequirementSelectorProps) {
  const [newRequirement, setNewRequirement] = React.useState("");

  const handleTogglePreset = (preset: string) => {
    if (value.includes(preset)) {
      onChange(value.filter((r) => r !== preset));
    } else {
      onChange([...value, preset]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = newRequirement.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setNewRequirement("");
    }
  };

  const handleRemove = (req: string) => {
    onChange(value.filter((r) => r !== req));
  };

  return (
    <div className="space-y-3">
      {/* 预设标签 */}
      <div className="space-y-2">
        <p className="text-sm text-stone-500">常用标签（点击快速添加）</p>
        <div className="flex flex-wrap gap-2">
          {REQUIREMENT_PRESETS.map((preset) => {
            const isSelected = value.includes(preset);
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleTogglePreset(preset)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  isSelected
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>
      </div>

      {/* 自定义输入 */}
      <div className="space-y-2">
        <p className="text-sm text-stone-500">或自定义添加</p>
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={newRequirement}
            onChange={(e) => setNewRequirement(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            className="border-stone-200"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddCustom}
            className="border-stone-200"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 已选择 */}
      {value.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-stone-500">已选择</p>
          <div className="flex flex-wrap gap-2">
            {value.map((req) => (
              <Badge
                key={req}
                variant="secondary"
                className="bg-stone-100 text-stone-700 hover:bg-stone-200 px-3 py-1"
              >
                {req}
                <button
                  type="button"
                  onClick={() => handleRemove(req)}
                  className="ml-2 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}