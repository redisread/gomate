'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkdownTextProps {
  text: string;
  className?: string;
}

/**
 * 转义 HTML 特殊字符，防止 XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 检查是否为内部链接（同一域名）
 */
function isInternalLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    // 检查是否为当前域名或相对路径
    if (typeof window !== 'undefined') {
      return parsed.hostname === window.location.hostname;
    }
    return false;
  } catch {
    // 相对路径视为内部链接
    return url.startsWith('/') && !url.startsWith('//');
  }
}

/**
 * 只解析斜体
 */
function parseItalicOnly(text: string, startKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const italicRegex = /(\*|_)(.+?)\1/g;
  const matches: Array<{ start: number; end: number; content: string }> = [];
  let match;

  while ((match = italicRegex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[2],
    });
  }

  if (matches.length > 0) {
    let lastIndex = 0;
    let key = startKey;
    for (const italic of matches) {
      if (italic.start > lastIndex) {
        parts.push(text.slice(lastIndex, italic.start));
      }
      parts.push(
        <em key={`italic-${key++}`} className="italic">
          {italic.content}
        </em>
      );
      lastIndex = italic.end;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  }

  return [text];
}

/**
 * 解析粗体和斜体
 */
function parseBoldAndItalic(text: string, startKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = startKey;

  // 粗体 **text** 或 __text__
  const boldRegex = /(\*\*|__)(.+?)\1/g;

  // 先处理粗体
  const boldMatches: Array<{ start: number; end: number; content: string }> = [];
  let match;
  while ((match = boldRegex.exec(remaining)) !== null) {
    boldMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[2],
    });
  }

  if (boldMatches.length > 0) {
    let lastIndex = 0;
    for (const bold of boldMatches) {
      // 粗体前的文本（处理斜体）
      if (bold.start > lastIndex) {
        const beforeText = remaining.slice(lastIndex, bold.start);
        parts.push(...parseItalicOnly(beforeText, key));
        key += 10;
      }
      // 粗体内容（内部再处理斜体）
      parts.push(
        <strong key={`bold-${key++}`} className="font-bold text-stone-900">
          {parseItalicOnly(bold.content, key).map((node, idx) => (
            <React.Fragment key={`bold-inner-${idx}`}>{node}</React.Fragment>
          ))}
        </strong>
      );
      lastIndex = bold.end;
    }
    // 最后一个粗体后的文本
    if (lastIndex < remaining.length) {
      const afterText = remaining.slice(lastIndex);
      parts.push(...parseItalicOnly(afterText, key));
    }
    return parts;
  }

  // 没有粗体，只处理斜体
  return parseItalicOnly(remaining, key);
}

/**
 * 解析行内样式（粗体、斜体、链接）
 */
function parseInlineStyles(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = escapeHtml(text);
  let keyCounter = 0;

  // 按优先级顺序处理：Markdown 链接 > URL > 粗体 > 斜体

  // 1. 处理 Markdown 链接 [文字](链接)
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s<>\)"{}|\\^`]+)\)/g;
  const mdLinks: Array<{ start: number; end: number; text: string; url: string }> = [];
  let match;
  while ((match = mdLinkRegex.exec(remaining)) !== null) {
    mdLinks.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
      url: match[2],
    });
  }

  if (mdLinks.length > 0) {
    let lastIndex = 0;
    for (const link of mdLinks) {
      // 处理链接前的文本
      if (link.start > lastIndex) {
        const beforeText = remaining.slice(lastIndex, link.start);
        parts.push(...parseBoldAndItalic(beforeText, keyCounter));
        keyCounter += 10;
      }

      // 渲染链接
      const isInternal = isInternalLink(link.url);
      if (isInternal) {
        parts.push(
          <Link
            key={`mdlink-${keyCounter++}`}
            href={link.url}
            className="text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            {link.text}
          </Link>
        );
      } else {
        parts.push(
          <a
            key={`mdlink-${keyCounter++}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-0.5"
          >
            {link.text}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }

      lastIndex = link.end;
    }
    // 处理最后一个链接后的文本
    if (lastIndex < remaining.length) {
      const afterText = remaining.slice(lastIndex);
      parts.push(...parseBoldAndItalic(afterText, keyCounter));
    }
    return parts;
  }

  // 2. 处理自动 URL 检测
  const urlRegex = /(https?:\/\/[^\s<>{})"|\\^`\[\]]+)/g;
  const urls: Array<{ start: number; end: number; url: string }> = [];
  while ((match = urlRegex.exec(remaining)) !== null) {
    urls.push({
      start: match.index,
      end: match.index + match[0].length,
      url: match[1],
    });
  }

  if (urls.length > 0) {
    let lastIndex = 0;
    for (const url of urls) {
      // 处理 URL 前的文本
      if (url.start > lastIndex) {
        const beforeText = remaining.slice(lastIndex, url.start);
        parts.push(...parseBoldAndItalic(beforeText, keyCounter));
        keyCounter += 10;
      }

      // 渲染 URL
      const isInternal = isInternalLink(url.url);
      if (isInternal) {
        parts.push(
          <Link
            key={`url-${keyCounter++}`}
            href={url.url}
            className="text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            {url.url}
          </Link>
        );
      } else {
        parts.push(
          <a
            key={`url-${keyCounter++}`}
            href={url.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-0.5"
          >
            {url.url}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }

      lastIndex = url.end;
    }
    // 处理最后一个 URL 后的文本
    if (lastIndex < remaining.length) {
      const afterText = remaining.slice(lastIndex);
      parts.push(...parseBoldAndItalic(afterText, keyCounter));
    }
    return parts;
  }

  // 3. 没有链接，只处理粗体和斜体
  return parseBoldAndItalic(remaining, keyCounter);
}

/**
 * 解析并渲染 Markdown 文本
 * 支持的格式：
 * - Markdown 链接：[文字](链接)
 * - 自动 URL：https://example.com
 * - 粗体：**文字** 或 __文字__
 * - 斜体：*文字* 或 _文字_
 * - 列表：- item 或 * item
 * - 换行
 */
export function MarkdownText({ text, className }: MarkdownTextProps) {
  if (!text) return null;

  // 按行分割处理
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // 空行处理
    if (!trimmedLine) {
      elements.push(<br key={`br-${i}`} />);
      continue;
    }

    // 列表项处理
    const listMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      const content = listMatch[1];
      elements.push(
        <li key={`li-${i}`} className="flex items-start gap-2">
          <span className="text-emerald-500 mt-1.5">•</span>
          <span>{parseInlineStyles(content)}</span>
        </li>
      );
      continue;
    }

    // 普通段落
    elements.push(
      <p key={`p-${i}`} className="mb-2 last:mb-0">
        {parseInlineStyles(trimmedLine)}
      </p>
    );
  }

  return <div className={cn('space-y-1', className)}>{elements}</div>;
}
