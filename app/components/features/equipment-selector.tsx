"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Tag } from "@/components/ui/tag";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EquipmentSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  maxCount?: number;
}

// 预设装备分类
const PRESET_EQUIPMENT = {
  essential: ["登山鞋", "背包", "水壶", "头灯", "急救包"],
  recommended: ["登山杖", "帽子", "防晒霜", "雨具", "手套"],
  optional: [
    "相机",
    "GPS",
    "充电宝",
    "冲锋衣",
    "保暖衣",
    "太阳镜",
    "防虫喷雾",
    "毛巾",
    "口哨",
    "绳索",
    "刀具",
    "打火机",
    "地图",
    "指南针",
    "食物",
    "零食",
    "手机",
  ],
};

// 装备图标映射
const EQUIPMENT_ICONS: Record<string, string> = {
  登山鞋: "🥾",
  背包: "🎒",
  水壶: "💧",
  头灯: "💡",
  急救包: "🏥",
  登山杖: "🥢",
  帽子: "🧢",
  防晒霜: "🧴",
  雨具: "☂️",
  手套: "🧤",
  相机: "📷",
  GPS: "🧭",
  充电宝: "🔋",
  冲锋衣: "🧥",
  保暖衣: "🧥",
  太阳镜: "🕶️",
  防虫喷雾: "🦟",
  毛巾: "🧻",
  口哨: "📣",
  绳索: "🪢",
  刀具: "🔪",
  打火机: "🔥",
  地图: "🗺️",
  指南针: "🧭",
  食物: "🍱",
  零食: "🍫",
  手机: "📱",
};

// 分类标题映射
const CATEGORY_TITLES = {
  essential: "必备装备",
  recommended: "推荐装备",
  optional: "其他装备",
};

// 分类样式映射
const CATEGORY_STYLES = {
  essential: {
    card: "bg-red-50 border-red-100 hover:border-red-200",
    active: "bg-red-100 border-red-300",
    text: "text-red-800",
    title: "text-red-700",
  },
  recommended: {
    card: "bg-blue-50 border-blue-100 hover:border-blue-200",
    active: "bg-blue-100 border-blue-300",
    text: "text-blue-800",
    title: "text-blue-700",
  },
  optional: {
    card: "bg-stone-50 border-stone-200 hover:border-stone-300",
    active: "bg-stone-200 border-stone-400",
    text: "text-stone-700",
    title: "text-stone-600",
  },
};

/**
 * 装备选择器组件
 * 支持从预设列表选择和自定义输入
 */
export function EquipmentSelector({
  value,
  onChange,
  maxCount = 20,
}: EquipmentSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 添加装备
  const addEquipment = React.useCallback(
    (item: string) => {
      const trimmed = item.trim();
      if (!trimmed) return;

      // 检查是否已存在（不区分大小写）
      const exists = value.some(
        (v) => v.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) return;

      // 检查是否超过最大数量
      if (value.length >= maxCount) {
        return;
      }

      onChange([...value, trimmed]);
    },
    [value, onChange, maxCount]
  );

  // 移除装备
  const removeEquipment = React.useCallback(
    (item: string) => {
      onChange(value.filter((v) => v !== item));
    },
    [value, onChange]
  );

  // 处理搜索框回车
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (searchQuery.trim()) {
          addEquipment(searchQuery);
          setSearchQuery("");
        }
      }
    },
    [searchQuery, addEquipment]
  );

  // 检查装备是否已选
  const isSelected = React.useCallback(
    (item: string) => {
      return value.some((v) => v.toLowerCase() === item.toLowerCase());
    },
    [value]
  );

  // 获取装备图标
  const getIcon = (name: string): string => {
    return EQUIPMENT_ICONS[name] || "📦";
  };

  return (
    <div className="space-y-4">
      {/* 已选装备标签区域 */}
      {value.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-700">
              已选装备 ({value.length}/{maxCount})
            </span>
            {value.length >= maxCount && (
              <span className="text-xs text-amber-600">
                已达到最大数量限制
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {value.map((item) => (
              <Tag
                key={item}
                variant="filled"
                color="primary"
                size="md"
                className="group flex items-center gap-1 pr-1 cursor-default"
              >
                <span>{getIcon(item)}</span>
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => removeEquipment(item)}
                  className="ml-1 p-0.5 rounded-full hover:bg-stone-700 transition-colors"
                  aria-label={`移除 ${item}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* 搜索/自定义输入框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <Input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索或输入新装备，按回车添加"
          className="pl-10 border-stone-200"
          disabled={value.length >= maxCount}
        />
      </div>

      {/* 预设装备分类区域 */}
      <div className="space-y-4">
        {(Object.keys(PRESET_EQUIPMENT) as Array<keyof typeof PRESET_EQUIPMENT>).map(
          (category) => (
            <div key={category} className="space-y-2">
              <h4
                className={cn(
                  "text-sm font-semibold",
                  CATEGORY_STYLES[category].title
                )}
              >
                {CATEGORY_TITLES[category]}
              </h4>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {PRESET_EQUIPMENT[category].map((item) => {
                  const selected = isSelected(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        selected ? removeEquipment(item) : addEquipment(item)
                      }
                      disabled={!selected && value.length >= maxCount}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                        "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-400",
                        selected
                          ? CATEGORY_STYLES[category].active
                          : CATEGORY_STYLES[category].card,
                        !selected &&
                          value.length >= maxCount &&
                          "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className="text-xl">{getIcon(item)}</span>
                      <span
                        className={cn(
                          "text-xs text-center font-medium",
                          CATEGORY_STYLES[category].text
                        )}
                      >
                        {item}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>

      {/* 提示信息 */}
      <p className="text-xs text-stone-500">
        点击上方装备图标添加或移除，也可在搜索框输入自定义装备后按回车添加
      </p>
    </div>
  );
}
