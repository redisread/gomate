"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
  headingOffset?: 0 | 1;
}

const baseComponents: Components = {
  a: ({ href = "", children, ...props }) => {
    const isSafe =
      /^https?:\/\//.test(href) ||
      href.startsWith("/") ||
      href.startsWith("#") ||
      href.startsWith("mailto:");

    if (!isSafe) {
      console.warn("[MarkdownContent] Blocked unsafe link:", href);
      return <span className="text-muted-foreground line-through" title="不安全的链接已阻止">{children}</span>;
    }

    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" {...props}>
        {children}
      </a>
    );
  },
};

const shiftedHeadingComponents: Components = {
  h1: ({ node: _node, ...props }) => <h2 {...props} />,
  h2: ({ node: _node, ...props }) => <h3 {...props} />,
  h3: ({ node: _node, ...props }) => <h4 {...props} />,
  h4: ({ node: _node, ...props }) => <h5 {...props} />,
  h5: ({ node: _node, ...props }) => <h6 {...props} />,
};

/**
 * Markdown 渲染组件
 * 基于 react-markdown + remark-gfm，支持 GFM 扩展语法
 * 通过 @tailwindcss/typography 的 prose 系列 class 控制样式
 */
export function MarkdownContent({ content, className, headingOffset = 0 }: MarkdownContentProps) {
  if (!content) return null;

  const components = headingOffset === 1
    ? { ...baseComponents, ...shiftedHeadingComponents }
    : baseComponents;

  return (
    <div className={cn("prose-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
