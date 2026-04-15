"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { City } from "@/lib/types";
import { useI18n } from "@/hooks/useI18n";

// 热门城市最大显示数量
const HOT_CITY_MAX = 6;
// 完整列表最大显示条数
const FULL_LIST_MAX = 20;

interface CitySelectProps {
  value: string;          // cityId
  onChange: (id: string) => void;
  cities: City[];
  error?: string;
  disabled?: boolean;
}

/**
 * 城市选择下拉组件
 * 支持搜索过滤、热门城市快捷选择、键盘导航
 */
export function CitySelect({
  value,
  onChange,
  cities,
  error,
  disabled = false,
}: CitySelectProps) {
  const { t } = useI18n(["common"]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // 当前选中城市名
  const selectedCity = useMemo(
    () => cities.find((c) => c.id === value),
    [cities, value]
  );

  // 热门城市（取前 6 个）
  const hotCities = useMemo(
    () => cities.filter((c) => c.isHot).slice(0, HOT_CITY_MAX),
    [cities]
  );

  // 按关键字过滤后的完整列表
  const filteredCities = useMemo(() => {
    const kw = query.trim().toLowerCase();
    if (!kw) return cities.slice(0, FULL_LIST_MAX);
    return cities
      .filter(
        (c) =>
          c.name.includes(kw) ||
          c.pinyin?.toLowerCase().includes(kw) ||
          c.province?.includes(kw)
      )
      .slice(0, FULL_LIST_MAX);
  }, [cities, query]);

  // 打开下拉，聚焦搜索框
  const handleOpen = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    setHighlightIndex(-1);
  }, [disabled]);

  // 选中城市
  const handleSelect = useCallback(
    (id: string) => {
      onChange(id);
      setOpen(false);
      setQuery("");
      setHighlightIndex(-1);
    },
    [onChange]
  );

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // 打开时自动聚焦搜索框
  useEffect(() => {
    if (open) {
      // 等待 DOM 渲染后聚焦
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev < filteredCities.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCities.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (highlightIndex >= 0 && filteredCities[highlightIndex]) {
            handleSelect(filteredCities[highlightIndex].id);
          }
          break;
      }
    },
    [open, filteredCities, highlightIndex, handleSelect]
  );

  // 高亮项滚动到可见区域
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightIndex] as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={handleKeyDown}
    >
      {/* 触发区：输入框样式 */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "w-full flex items-center justify-between gap-2",
          "h-10 px-3 rounded-md border bg-white text-sm",
          "transition-colors duration-150 outline-none",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
            : open
            ? "border-amber-500 ring-2 ring-amber-200"
            : "border-zinc-300 hover:border-zinc-400"
        )}
      >
        <span
          className={cn(
            "truncate",
            selectedCity ? "text-zinc-900" : "text-zinc-400"
          )}
        >
          {selectedCity ? selectedCity.name : t("common.selectCity")}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-shrink-0 text-zinc-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* 错误提示 */}
      {error && (
        <p className="mt-1 text-xs text-red-500" role="alert">
          {error}
        </p>
      )}

      {/* 下拉面板 */}
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-full",
            "bg-white rounded-lg border border-zinc-200 shadow-lg",
            "animate-in fade-in-0 zoom-in-95 duration-100"
          )}
        >
          {/* 搜索框 */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
            <Search className="h-4 w-4 flex-shrink-0 text-zinc-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlightIndex(-1);
              }}
              placeholder={t("common.search")}
              className="flex-1 text-sm outline-none placeholder:text-zinc-400"
            />
          </div>

          {/* 热门城市（仅无搜索词时显示） */}
          {!query.trim() && hotCities.length > 0 && (
            <div className="px-3 pt-2 pb-1">
              <p className="mb-1.5 text-xs font-medium text-zinc-400">{t("common.hotCities")}</p>
              <div className="flex flex-wrap gap-1.5">
                {hotCities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleSelect(city.id)}
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs border transition-colors duration-150",
                      city.id === value
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "border-zinc-200 text-zinc-700 hover:border-amber-400 hover:text-amber-600"
                    )}
                  >
                    {city.name}
                  </button>
                ))}
              </div>
              <div className="mt-2 border-t border-zinc-100" />
            </div>
          )}

          {/* 城市完整列表 */}
          <ul
            ref={listRef}
            role="listbox"
            aria-label={t("common.cityList")}
            className="max-h-48 overflow-y-auto py-1"
          >
            {filteredCities.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-zinc-400">
                {t("common.noCitiesFound")}
              </li>
            ) : (
              filteredCities.map((city, index) => (
                <li
                  key={city.id}
                  role="option"
                  aria-selected={city.id === value}
                  onClick={() => handleSelect(city.id)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 cursor-pointer text-sm",
                    "transition-colors duration-100",
                    index === highlightIndex
                      ? "bg-amber-50 text-amber-700"
                      : city.id === value
                      ? "bg-zinc-50 text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{city.name}</span>
                    {city.province && (
                      <span className="text-xs text-zinc-400">
                        {city.province}
                      </span>
                    )}
                  </span>
                  {city.id === value && (
                    <Check className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
