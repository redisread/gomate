"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Search, MapPin, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  onSearch?: (query: string) => void;
  onFilterClick?: () => void;
}

function SearchBar({ className, onSearch, onFilterClick }: SearchBarProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("w-full max-w-2xl mx-auto", className)}
    >
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            "relative flex items-center bg-white rounded-2xl border transition-all duration-300",
            isFocused
              ? "border-stone-400 shadow-lg shadow-stone-200"
              : "border-stone-200 shadow-sm hover:border-stone-300"
          )}
        >
          {/* Search Icon */}
          <div className="absolute left-4 text-stone-400">
            <Search className="h-5 w-5" />
          </div>

          {/* Input */}
          <input
            type="text"
            placeholder="搜索地点、路线或队伍..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full pl-12 pr-32 py-4 bg-transparent text-stone-800 placeholder:text-stone-400 focus:outline-none text-base"
          />

          {/* Actions */}
          <div className="absolute right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={onFilterClick}
              className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              aria-label="筛选"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 transition-colors"
            >
              搜索
            </button>
          </div>
        </div>

        {/* Quick Tags */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {["七娘山", "梧桐山", "东西冲", "马峦山", "塘朗山"].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setQuery(tag)}
              className="px-3 py-1.5 text-sm text-stone-600 bg-white border border-stone-200 rounded-full hover:border-stone-400 hover:text-stone-900 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </form>
    </motion.div>
  );
}

export { SearchBar };
