"use client";

import { Dropdown, DropdownTrigger, DropdownContent, DropdownRadioGroup, DropdownRadioItem } from "@/components/starwind-react/dropdown";
import { Button as SwButton } from "@/components/starwind-react/button";

import * as React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { getTheme, initThemeSystemListener, setTheme, type Theme } from "@/stores/theme";

export function ThemeToggle() {
  const { t } = useI18n(["common"]);
  const [theme, setLocalTheme] = React.useState<Theme>(() => getTheme());
  const [mounted, setMounted] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  // Initialize system preference listener on client
  React.useEffect(() => {
    const cleanup = initThemeSystemListener(() => setLocalTheme(getTheme()));
    setMounted(true);
    return cleanup;
  }, []);

  if (!mounted) {
    return (
      <SwButton variant="plain" size="inherit" type="button"
        className="h-9 w-9 flex items-center justify-center rounded-lg text-stone-600 dark:text-stone-400 hover:bg-accent hover:text-foreground transition-colors duration-150"
        aria-label={t('common.toggleLabel')}
      >
        <Sun className="h-4 w-4" />
      </SwButton>
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

  const handleSelect = (newTheme: Theme) => {
    setTheme(newTheme);
    setLocalTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <Dropdown open={isOpen} onOpenChange={setIsOpen} className="relative" data-theme-toggle>
      <DropdownTrigger type="button"
        className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-stone-600 dark:text-stone-400 hover:bg-accent hover:text-foreground transition-colors duration-150"
        aria-label={t("common.toggleLabel")}
      >
        {getCurrentIcon()}
      </DropdownTrigger>
      <DropdownContent disablePortal align="end" className="w-36 rounded-xl bg-popover border border-border shadow-lg">
        <DropdownRadioGroup value={theme} onValueChange={(value) => handleSelect(value as Theme)}>
          {([{ value: "light", Icon: Sun }, { value: "dark", Icon: Moon }, { value: "system", Icon: Monitor }] as const).map(({ value, Icon }) => (
            <DropdownRadioItem key={value} value={value} closeOnClick showIndicator={false}
              className={cn("min-h-11 w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors", theme === value ? "text-primary bg-accent" : "text-foreground hover:bg-accent")}
            >
              <Icon className="h-4 w-4" />
              <span>{t(`common.${value}`)}</span>
            </DropdownRadioItem>
          ))}
        </DropdownRadioGroup>
      </DropdownContent>
    </Dropdown>
  );
}
