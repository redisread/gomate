 "use client";

 import ReactMarkdown from "react-markdown";
 import remarkGfm from "remark-gfm";
 import { cn } from "@/lib/utils";

 interface MarkdownContentProps {
   content: string;
   className?: string;
 }

 /**
  * Markdown 渲染组件
  * 基于 react-markdown + remark-gfm，支持 GFM 扩展语法
  * 通过 @tailwindcss/typography 的 prose 系列 class 控制样式
  */
 export function MarkdownContent({ content, className }: MarkdownContentProps) {
   if (!content) return null;

   return (
     <div className={cn("prose-content", className)}>
       <ReactMarkdown
         remarkPlugins={[remarkGfm]}
         components={{
           a: ({ href, children, ...props }) => (
             <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
               {children}
             </a>
           ),
         }}
       >
         {content}
       </ReactMarkdown>
     </div>
   );
 }
