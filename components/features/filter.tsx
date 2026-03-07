"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

interface FilterOption {
  id: string;
  label: string;
}

interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
}

// 默认筛选组为空，城市筛选通过 extraGroups 传入
const defaultFilterGroups: FilterGroup[] = [];

interface FilterProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
  selectedFilters?: Record<string, string[]>;
  onFilterChange?: (groupId: string, optionId: string) => void;
  extraGroups?: FilterGroup[];
  /** @deprecated Use extraGroups instead */
  cities?: { id: string; name: string }[];
}

function Filter({
  className,
  isOpen = false,
  onClose,
  selectedFilters = {},
  onFilterChange,
  extraGroups = [],
  cities = [],
}: FilterProps) {
  const filterGroups = React.useMemo(() => {
    const groups: FilterGroup[] = [];

    // 城市筛选
    if (cities.length > 0) {
      groups.push({
        id: "city",
        label: copy.filter.city,
        options: cities.map(c => ({ id: c.id, label: c.name })),
      });
    }

    // 额外分组
    groups.push(...extraGroups);

    return groups;
  }, [extraGroups, cities]);
  // 桌面端：当前打开的下拉菜单 groupId
  const [openDesktopGroup, setOpenDesktopGroup] = React.useState<string | null>(null);
  // 移动端抽屉内：展开的分组
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(
    filterGroups.map((g) => g.id)
  );
  const desktopRef = React.useRef<HTMLDivElement>(null);

  // 点击外部关闭桌面端下拉菜单
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (desktopRef.current && !desktopRef.current.contains(e.target as Node)) {
        setOpenDesktopGroup(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDesktopGroup = (groupId: string) => {
    setOpenDesktopGroup((prev) => (prev === groupId ? null : groupId));
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const isSelected = (groupId: string, optionId: string) => {
    return selectedFilters[groupId]?.includes(optionId) ?? false;
  };

  const activeFiltersCount = Object.values(selectedFilters).flat().length;

  return (
    <>
      {/* Desktop Filter */}
      <div ref={desktopRef} className={cn("hidden lg:block", className)}>
        <div className="flex items-center gap-2 flex-wrap">
          {filterGroups.map((group) => (
            <div key={group.id} className="relative">
              <button
                className={cn(
                  "flex items-center gap-1 px-4 py-2 text-sm font-medium text-stone-700 bg-white border rounded-full transition-colors",
                  openDesktopGroup === group.id
                    ? "border-stone-400"
                    : "border-stone-200 hover:border-stone-400"
                )}
                onClick={() => toggleDesktopGroup(group.id)}
              >
                {group.label}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-stone-400 transition-transform",
                    openDesktopGroup === group.id && "rotate-180"
                  )}
                />
              </button>

              {/* Dropdown */}
              {openDesktopGroup === group.id && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl border border-stone-200 shadow-lg z-20">
                  <div className="p-2">
                    {group.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => onFilterChange?.(group.id, option.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                          isSelected(group.id, option.id)
                            ? "bg-stone-100 text-stone-900 font-medium"
                            : "text-stone-600 hover:bg-stone-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          {option.label}
                          {isSelected(group.id, option.id) && (
                            <span className="w-2 h-2 rounded-full bg-stone-800" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Active Filters Count */}
          {activeFiltersCount > 0 && (
            <button
              onClick={() => onFilterChange?.("clear", "all")}
              className="px-3 py-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              {copy.common.clearAll} ({activeFiltersCount})
            </button>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 lg:hidden max-h-[80vh] overflow-auto"
            >
              <div className="p-4 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-semibold text-stone-900">{copy.filter.title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-stone-500" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {filterGroups.map((group) => (
                  <div key={group.id}>
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between py-2 text-left"
                    >
                      <span className="font-medium text-stone-900">
                        {group.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 text-stone-400 transition-transform",
                          expandedGroups.includes(group.id) && "rotate-180"
                        )}
                      />
                    </button>

                    {expandedGroups.includes(group.id) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {group.options.map((option) => (
                          <button
                            key={option.id}
                            onClick={() =>
                              onFilterChange?.(group.id, option.id)
                            }
                            className={cn(
                              "px-4 py-2 text-sm rounded-full border transition-colors",
                              isSelected(group.id, option.id)
                                ? "bg-stone-900 text-white border-stone-900"
                                : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-stone-100 sticky bottom-0 bg-white">
                <div className="flex gap-3">
                  <button
                    onClick={() => onFilterChange?.("clear", "all")}
                    className="flex-1 px-4 py-3 text-sm font-medium text-stone-700 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors"
                  >
                    {copy.filter.reset}
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 text-sm font-medium text-white bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors"
                  >
                    {copy.filter.viewResults}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export { Filter };
