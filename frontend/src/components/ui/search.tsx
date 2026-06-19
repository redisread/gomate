import React from "react";

interface HighlightedTextProps {
  text: string;
  keyword: string;
  className?: string;
}

/**
 * 高亮搜索关键词的文本组件
 * 使用 <mark> 标签实现高亮效果
 */
export function HighlightedText({ text, keyword, className = "" }: HighlightedTextProps) {
  if (!keyword.trim()) {
    return <span className={className}>{text}</span>;
  }

  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark
            key={i}
            className="bg-amber-200 text-amber-900 px-0.5 rounded dark:bg-amber-900/50 dark:text-amber-300"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

/**
 * 搜索结果项组件
 */
interface SearchResultItemProps {
  id: string;
  name: string;
  coverImage?: string | null;
  cityName?: string | null;
  keyword: string;
  onClick?: () => void;
}

export function SearchResultItem({
  id: _id,
  name,
  coverImage,
  cityName,
  keyword,
  onClick,
}: SearchResultItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors text-left"
    >
      {coverImage && (
        <img
          src={coverImage}
          alt={name}
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-stone-900 dark:text-stone-100 truncate">
          <HighlightedText text={name} keyword={keyword} />
        </div>
        {cityName && (
          <div className="text-sm text-stone-500 dark:text-stone-400">{cityName}</div>
        )}
      </div>
    </button>
  );
}

/**
 * 搜索建议列表组件
 */
interface SearchSuggestionsProps {
  suggestions: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

export function SearchSuggestions({ suggestions, onSuggestionClick }: SearchSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="py-2">
      <div className="px-3 py-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">
        热门搜索
      </div>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSuggestionClick?.(suggestion)}
          className="w-full px-3 py-2 text-left text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-4 h-4 text-stone-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          {suggestion}
        </button>
      ))}
    </div>
  );
}
