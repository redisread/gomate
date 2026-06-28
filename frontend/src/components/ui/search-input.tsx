import React, { useState, useRef, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { SearchResultItem, SearchSuggestions } from "./search";

interface Location {
  id: string;
  name: string;
  slug: string;
  coverImage: string | null;
  cityName: string | null;
}

interface SearchDropdownProps {
  query: string;
  onSelect: (location: Location) => void;
  onClose: () => void;
}

/**
 * 搜索下拉框组件
 * 显示搜索结果和建议
 */
function SearchDropdown({ query, onSelect, onClose }: SearchDropdownProps) {
  const [results, setResults] = useState<Location[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // 搜索请求
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetchAPI(`/api/locations/search?q=${encodeURIComponent(query)}&limit=10`);
        const data = await res.json();
        if (data.success) {
          setResults(data.locations);
          setSuggestions(data.suggestions);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    // 防抖 300ms
    const timeout = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  if (!query.trim() && suggestions.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 overflow-hidden z-50"
    >
      {loading && (
        <div className="p-4 text-center text-stone-500">
          <div className="animate-spin inline-block w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="max-h-80 overflow-y-auto">
          {results.map((location) => (
            <SearchResultItem
              key={location.id}
              {...location}
              keyword={query}
              onClick={() => onSelect(location)}
            />
          ))}
        </div>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <div className="p-4 text-center text-stone-500">未找到相关地点</div>
      )}

      <SearchSuggestions
        suggestions={suggestions}
        onSuggestionClick={(suggestion) => {
          // 可以触发搜索或跳转
          window.location.href = `/locations?search=${encodeURIComponent(suggestion)}`;
        }}
      />
    </div>
  );
}

interface SearchInputProps {
  placeholder?: string;
  className?: string;
}

/**
 * 搜索输入框组件
 * 带实时下拉搜索结果
 */
export function SearchInput({ placeholder = "搜索地点...", className = "" }: SearchInputProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = useCallback((location: Location) => {
    window.location.href = `/locations/${location.slug}`;
    setIsOpen(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full pl-10 pr-4 py-2.5 bg-stone-100 dark:bg-stone-800 border-0 rounded-xl text-stone-900 dark:text-stone-100 placeholder:text-stone-500 focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-600"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:block px-2 py-0.5 text-xs text-stone-500 bg-stone-200 dark:bg-stone-700 rounded">
          ⌘K
        </kbd>
      </div>

      {isOpen && (
        <SearchDropdown
          query={query}
          onSelect={handleSelect}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
