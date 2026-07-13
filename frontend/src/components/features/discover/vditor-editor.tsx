"use client";

import * as React from "react";
import type Vditor from "vditor";
import { useI18n } from "@/hooks/useI18n";

interface VditorEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

/**
 * 检测当前是否为暗色主题
 */
function detectDark(): boolean {
  return document.documentElement.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * 确保 Vditor 基础 CSS 已加载
 * 生产构建时 Vite/Astro 未能正确打包 node_modules 中的 CSS import，
 * 因此通过动态注入 link 标签作为可靠 fallback。
 */
function ensureVditorCSS(): void {
  const linkId = "vditor-base-css";
  if (document.getElementById(linkId)) {
    return;
  }
  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = `${VDITOR_CDN}/dist/index.css`;
  document.head.appendChild(link);
}

/**
 * Vditor SV（分屏）编辑器组件
 * 左侧编辑 Markdown 源码，右侧实时预览渲染结果
 * 支持暗色主题
 *
 * CDN 指向本地 /vditor/dist 静态资源，避免 unpkg.com 在国内不可访问的问题
 */
const VDITOR_CDN = "/vditor";

export function VditorEditor({ value, onChange, placeholder, readOnly = false }: VditorEditorProps) {
  const vditorRef = React.useRef<HTMLDivElement>(null);
  const instanceRef = React.useRef<Vditor | null>(null);
  const { t } = useI18n(["content"]);

  // 用 ref 持有最新值，避免 Vditor 回调中的 stale closure
  const valueRef = React.useRef(value);
  const onChangeRef = React.useRef(onChange);
  const placeholderRef = React.useRef(placeholder);

  React.useEffect(() => { valueRef.current = value; }, [value]);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  React.useEffect(() => { placeholderRef.current = placeholder; }, [placeholder]);

  // 监听暗色主题
  const [isDark, setIsDark] = React.useState(false);
  React.useEffect(() => {
    const checkDark = () => setIsDark(detectDark());
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // 初始化 Vditor
  React.useEffect(() => {
    if (!vditorRef.current || instanceRef.current) return;

    let cancelled = false;
    let vditorInstance: Vditor | null = null;

    // 动态注入基础样式（兼容生产构建 CSS 未打包的情况）
    ensureVditorCSS();

    (async () => {
      const Vditor = (await import("vditor")).default;

      if (cancelled || !vditorRef.current) return;

      // 在初始化时重新读取主题，避免闭包捕获到旧值
      const dark = detectDark();

      vditorInstance = new Vditor(vditorRef.current, {
        mode: "sv",
        height: "100%",
        minHeight: 400,
        placeholder: placeholderRef.current ?? t("content.writeStories"),
        theme: dark ? "dark" : "classic",
        cdn: VDITOR_CDN,
        toolbar: readOnly
          ? []
          : [
              "headings",
              "bold",
              "italic",
              "strike",
              "|",
              "link",
              "list",
              "ordered-list",
              "check",
              "|",
              "quote",
              "line",
              "code",
              "inline-code",
              "|",
              "table",
              "undo",
              "redo",
              "|",
              "preview",
              "fullscreen",
              "|",
              "outline",
            ],
        preview: {
          mode: "both",
          delay: 300,
          // @ts-expect-error IPreview 类型不含 theme，但运行时支持
          theme: {
            current: dark ? "dark" : "light",
          },
          hljs: {
            style: dark ? "atom-one-dark" : "github",
          },
        },
        resize: {
          enable: !readOnly,
          position: "bottom",
        },
        input: (md: string) => {
          if (md !== valueRef.current) {
            onChangeRef.current(md);
          }
        },
        after: () => {
          if (vditorInstance) {
            vditorInstance.setValue(valueRef.current);
            // 确保代码高亮主题 CSS 被加载（初始化时 setCodeTheme 不会自动调用）
            vditorInstance.setTheme(
              dark ? "dark" : "classic",
              dark ? "dark" : "light",
              dark ? "atom-one-dark" : "github"
            );
            // 初始化时应用 readOnly 状态
            if (readOnly) {
              try { vditorInstance.disabled(); } catch { /* ignore */ }
            }
          }
        },
      });

      if (!cancelled) {
        instanceRef.current = vditorInstance;
      }
    })();

    return () => {
      cancelled = true;
      if (instanceRef.current) {
        try {
          instanceRef.current.destroy();
        } catch {
          // ignore
        }
        instanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 同步外部 value 变化
  React.useEffect(() => {
    if (instanceRef.current && value !== instanceRef.current.getValue()) {
      instanceRef.current.setValue(value);
    }
  }, [value]);

  // 监听主题切换
  React.useEffect(() => {
    if (instanceRef.current && isDark !== (instanceRef.current.vditor?.options?.theme === "dark")) {
      try {
        instanceRef.current.setTheme(
          isDark ? "dark" : "classic",
          isDark ? "dark" : "light",
          isDark ? "atom-one-dark" : "github"
        );
      } catch (_e) {
        console.warn("[VditorEditor] Theme switch failed:", _e);
      }
    }
  }, [isDark]);

  // 监听 readOnly 变化
  React.useEffect(() => {
    if (instanceRef.current) {
      try {
        if (readOnly) {
          instanceRef.current.disabled();
        } else {
          instanceRef.current.enable();
        }
      } catch (_e) {
        console.warn("[VditorEditor] ReadOnly toggle failed:", _e);
      }
    }
  }, [readOnly]);

  return <div ref={vditorRef} className="vditor" />;
}
