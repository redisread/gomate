"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * 简单的 Markdown 渲染组件
 * 支持：标题、粗体、斜体、链接、列表、代码块
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const html = React.useMemo(() => {
    if (!content) return "";

    let html = content
      // 转义 HTML 特殊字符
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // 代码块 (```code```)
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted/70 p-4 rounded-lg overflow-x-auto my-6 text-sm"><code>$1</code></pre>')
      // 行内代码 (`code`)
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary/80">$1</code>')
      // 标题 ######
      .replace(/^###### (.*$)/gim, '<h6 class="text-base font-semibold mt-6 mb-2 text-foreground/90">$1</h6>')
      // 标题 #####
      .replace(/^##### (.*$)/gim, '<h5 class="text-lg font-semibold mt-8 mb-3 text-foreground/90">$1</h5>')
      // 标题 ####
      .replace(/^#### (.*$)/gim, '<h4 class="text-xl font-semibold mt-8 mb-3 text-foreground">$1</h4>')
      // 标题 ###
      .replace(/^### (.*$)/gim, '<h3 class="text-2xl font-bold mt-10 mb-4 text-foreground border-b border-border/50 pb-2">$1</h3>')
      // 标题 ##
      .replace(/^## (.*$)/gim, '<h2 class="text-3xl font-bold mt-12 mb-6 text-foreground">$1</h2>')
      // 标题 #
      .replace(/^# (.*$)/gim, '<h1 class="text-4xl font-bold mt-12 mb-6 text-foreground">$1</h1>')
      // 粗体
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      // 斜体
      .replace(/\*(.*?)\*/g, '<em class="italic text-muted-foreground">$1</em>')
      // 删除线
      .replace(/~~(.*?)~~/g, '<del class="line-through text-muted-foreground">$1</del>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer">$1</a>')
      // 无序列表 - 使用自定义样式
      .replace(/^\s*[-*+] (.*$)/gim, '<li class="pl-2 py-1 relative before:content-["•"] before:absolute before:left-[-1rem] before:text-primary/60">$1</li>')
      // 有序列表
      .replace(/^\s*\d+\. (.*$)/gim, '<li class="pl-2 py-1 relative list-decimal marker:text-muted-foreground">$1</li>')
      // 引用块 - 增强样式
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-primary/40 bg-accent/30 pl-5 pr-4 py-3 my-6 rounded-r-lg text-foreground/80">$1</blockquote>')
      // 分隔线
      .replace(/^---$/gim, '<hr class="my-8 border-border/60" />')
      // 段落 - 增加行高和间距
      .replace(/\n\n/g, '</p><p class="mb-5 leading-[1.8] text-foreground/90">')
      // 换行
      .replace(/\n/g, '<br />');

    // 包裹在段落中
    if (!html.startsWith('<h') && !html.startsWith('<pre') && !html.startsWith('<blockquote') && !html.startsWith('<li')) {
      html = '<p class="mb-5 leading-[1.8] text-foreground/90">' + html + '</p>';
    }

    // 包装列表项
    html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, '<ul class="my-5 pl-6 space-y-1">$&</ul>');

    return html;
  }, [content]);

  return (
    <div
      className={cn("prose prose-neutral dark:prose-invert max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
