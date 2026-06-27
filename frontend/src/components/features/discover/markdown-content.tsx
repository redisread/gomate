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
  a: ({ href, children, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
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
