import * as React from "react";
import { useI18n } from "@/hooks/useI18n";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

/**
 * Small, dependency-free Markdown input.
 * Rendering stays in the existing MarkdownContent island; editing only needs
 * a controlled textarea and should not ship a 20+ MB browser editor.
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  readOnly = false,
}: MarkdownEditorProps) {
  const { t } = useI18n(["content"]);

  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder ?? t("content.writeStories")}
      readOnly={readOnly}
      aria-label={t("content.writeStories")}
      className="min-h-[400px] w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-sm leading-6 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
    />
  );
}
