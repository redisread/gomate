"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
  id: string;
  label: string;
}

interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
}

const filterGroups: FilterGroup[] = [
  {
    id: "difficulty",
    label: "难度",
    options: [
      { id: "easy", label: "简单" },
      { id: "moderate", label: "中等" },
      { id: "hard", label: "困难" },
      { id: "extreme", label: "极难" },
    ],
  },
  {
    id: "duration",
    label: "时长",
    options: [
      { id: "short", label: "半日内" },
      { id: "day", label: "一日" },
      { id: "multi", label: "多日" },
    ],
  },
  {
    id: "region",
    label: "区域",
    options: [
      { id: "nanshan", label: "南山区" },
      { id: "futian", label: "福田区" },
      { id: "luohu", label: "罗湖区" },
      { id: "dapeng", label: "大鹏新区" },
      { id: "pingshan", label: "坪山区" },
    ],
  },
];

interface FilterProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
  selectedFilters?: Record<string, string[]>;
  onFilterChange?: (groupId: string, optionId: string) => void;
}

function Filter({
  className,
  isOpen = false,
  onClose,
  selectedFilters = {},
  onFilterChange,
}: FilterProps) {
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(
    filterGroups.map((g) => g.id)
  );

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
      <div className={cn("hidden lg:block", className)}>
        <div className="flex items-center gap-2 flex-wrap">
          {filterGroups.map((group) => (
            <div key={group.id} className="relative group">
              <button
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-full hover:border-stone-400 transition-colors"
                onClick={() => toggleGroup(group.id)}
              >
                {group.label}
                <ChevronDown className="h-4 w-4 text-stone-400" />
              </button>

              {/* Dropdown */}
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl border border-stone-200 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
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
            </div>
          ))}

          {/* Active Filters Count */}
          {activeFiltersCount > 0 && (
            <button
              onClick={() => onFilterChange?.("clear", "all")}
              className="px-3 py-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              清除全部 ({activeFiltersCount})
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
                <h2 className="text-lg font-semibold text-stone-900">筛选</h2>
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
                    重置
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 text-sm font-medium text-white bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors"
                  >
                    查看结果
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
