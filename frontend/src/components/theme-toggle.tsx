"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  // 防止 hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // 点击外部关闭菜单
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-theme-toggle]")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [isOpen]);

  if (!mounted) {
    return (
      <button
        className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150"
        aria-label={copy.theme.toggleLabel}
      >
        <Sun className="h-4 w-4" />
      </button>
    );
  }

  const getCurrentIcon = () => {
    switch (theme) {
      case "dark":
        return <Moon className="h-4 w-4" />;
      case "system":
        return <Monitor className="h-4 w-4" />;
      default:
        return <Sun className="h-4 w-4" />;
    }
  };

  const handleSelect = (newTheme: string) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className="relative" data-theme-toggle>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150"
        aria-label={copy.theme.toggleLabel}
      >
        {getCurrentIcon()}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 w-36 rounded-xl overflow-hidden z-50 bg-popover border border-border shadow-lg"
          style={{
            animation: "fade-up 0.15s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          <button
            onClick={() => handleSelect("light")}
            className={cn(
              "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
              theme === "light"
                ? "text-primary bg-accent"
                : "text-foreground hover:bg-accent"
            )}
          >
            <Sun className="h-4 w-4" />
            <span>{copy.theme.light}</span>
          </button>
          <button
            onClick={() => handleSelect("dark")}
            className={cn(
              "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
              theme === "dark"
                ? "text-primary bg-accent"
                : "text-foreground hover:bg-accent"
            )}
          >
            <Moon className="h-4 w-4" />
            <span>{copy.theme.dark}</span>
          </button>
          <button
            onClick={() => handleSelect("system")}
            className={cn(
              "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
              theme === "system"
                ? "text-primary bg-accent"
                : "text-foreground hover:bg-accent"
            )}
          >
            <Monitor className="h-4 w-4" />
            <span>{copy.theme.system}</span>
          </button>
        </div>
      )}
    </div>
  );
}
