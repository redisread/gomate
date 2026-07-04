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
 * Vditor 即时渲染（IR）编辑器组件
 * 封装 Vditor 3.11+，支持暗色主题
 */
export function VditorEditor({ value, onChange, placeholder, readOnly = false }: VditorEditorProps) {
  const vditorRef = React.useRef<HTMLDivElement>(null);
  const instanceRef = React.useRef<Vditor | null>(null);
  const { t } = useI18n(["content"]);

  // 监听暗色主题
  const [isDark, setIsDark] = React.useState(false);
  React.useEffect(() => {
    const checkDark = () => {
      const dark = document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(dark);
    };
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

    (async () => {
      const Vditor = (await import("vditor")).default;

      if (cancelled || !vditorRef.current) return;

      // 导入对应主题 CSS
      if (isDark) {
        await import("vditor/dist/css/content-theme/dark.css");
      } else {
        await import("vditor/dist/css/content-theme/light.css");
      }

      vditorInstance = new Vditor(vditorRef.current, {
        mode: "ir",
        height: 400,
        minHeight: 200,
        placeholder: placeholder ?? t("content.writeStories"),
        theme: isDark ? "dark" : "classic",
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
            ],
        input: (md: string) => {
          if (md !== value) {
            onChange(md);
          }
        },
        after: () => {
          if (vditorInstance) {
            vditorInstance.setValue(value);
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
        instanceRef.current.setTheme(isDark ? "dark" : "classic");
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
