"use client";

import * as React from "react";
import { Mountain, Menu, X, User, Settings, Plus, LogOut, Heart, ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchCurrentUser, API_BASE } from "@/lib/api";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { type Locale, SUPPORTED_LOCALES, getLocale, setLocale, getLocaleName } from "@/i18n";
import { useI18n } from "@/hooks/useI18n";
import { useIPLocation, getCityDisplay } from "@/hooks/useIPLocation";
import { SearchInput } from "@/components/ui/search-input";

const navLinks = (t: (key: any) => string) => [
  { href: "/",          label: t("nav.home") },
  { href: "/locations", label: t("nav.locations") },
  { href: "/teams",     label: t("nav.teams") },
  { href: "/discover",  label: t("nav.discover") },
];

interface NavbarProps {
  className?: string;
}

/**
 * 响应式导航栏（Design System v3.0）
 * - 滚动前透明；滚动后毛玻璃（暖白 + blur）
 * - 活跃链接：品牌绿下划线 + 高亮文字
 * - Logo：Mountain 图标 + 品牌绿渐变文字
 * - 主 CTA：品牌绿按钮 + 绿色光晕
 * - 移动端：从右侧 slide-in 抽屉
 * - 用户菜单：hover 展开下拉
 */
export function Navbar({ className }: NavbarProps) {
  const { t } = useI18n(["nav", "common"]);
  // SSR/CSR 初始状态必须一致，避免 hydration mismatch
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [currentPath, setCurrentPath] = React.useState("");
  const [session, setSession] = React.useState<{
    user?: { id: string; name: string; nickname?: string; email: string; image?: string };
    isAdmin?: boolean;
  } | null>(null);
  // 延迟应用活跃状态，避免 SSR/CSR 不一致导致 hydration mismatch
  const [mounted, setMounted] = React.useState(false);

  // IP 定位获取用户城市（仅登录后）
  const { city, isLoading: isLocating } = useIPLocation();
  const userCity = session?.user ? getCityDisplay({ city }) : null;

  // 获取当前路径（使用静态值避免 hydration mismatch）
  React.useEffect(() => {
    // 只在客户端执行，避免 SSR/CSR 不一致
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
      setMounted(true);
    }
  }, []);

  // 滚动监听（只在客户端执行）
  React.useEffect(() => {
    // 初始检测滚动位置
    setIsScrolled(window.scrollY > 20);
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 获取登录会话（两步加载，绕过 KV 缓存）
  React.useEffect(() => {
    (async () => {
      const u = await fetchCurrentUser(); // 静默失败，不跳转
      if (!u) return;
      setSession({ user: u as { id: string; name: string; nickname?: string; email: string; image?: string } });
    })();
  }, []);

  // 移动菜单打开时锁定滚动
  React.useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  // 点击外部关闭用户菜单
  React.useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-user-menu]")) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showUserMenu]);

  const handleLogout = async () => {
    await fetch(
      `${API_BASE}/auth/sign-out`,
      { method: "POST", credentials: "include" }
    );
    setSession(null);
    window.location.href = "/";
  };

  /** 判断链接是否活跃（只在客户端执行，避免 SSR/CSR 不一致） */
  const isActive = (href: string) => {
    // SSR 时 currentPath 为空，避免 hydration mismatch
    if (!currentPath) return false;
    if (href === "/") return currentPath === "/";
    return currentPath.startsWith(href);
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "transition-all duration-300 ease-out",
          isScrolled ? "navbar-glass shadow-warm-sm" : "bg-transparent",
          className
        )}
        suppressHydrationWarning
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">

            {/* ---- Logo ---- */}
            <a
              href="/"
              className="flex items-center gap-2.5 group shrink-0"
              aria-label={t("common.home")}
            >
              <Mountain
                className="h-7 w-7 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                style={{ color: "#D97706" }}
              />
              <span className="text-xl font-bold tracking-tight text-gradient-brand">
                GoMate
              </span>
            </a>

            {/* ---- 桌面端导航 ---- */}
            <nav
              className="hidden md:flex items-center gap-1"
              aria-label={t("common.mainNav")}
              suppressHydrationWarning
            >
              {navLinks(t).map((link) => {
                const active = isActive(link.href);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative px-3.5 py-2 text-sm font-medium rounded-lg transition-colors duration-150",
                      active
                        ? "text-primary bg-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    {link.label}
                    {/* 活跃下划线 */}
                    {active && (
                      <span
                        className="absolute bottom-0.5 left-3.5 right-3.5 h-0.5 rounded-full bg-primary"
                      />
                    )}
                  </a>
                );
              })}
            </nav>

            {/* ---- 桌面端操作区 ---- */}
            <div className="hidden md:flex items-center gap-2">
              {/* 搜索框 */}
              <SearchInput className="w-56" />

              {/* 语言切换 */}
              <LanguageSwitcher />

              {/* 主题切换 */}
              <ThemeToggle />

              {session?.isAdmin && (
                <a
                  href="/admin/locations"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-accent hover:text-foreground transition-colors duration-150"
                >
                  <Settings className="h-4 w-4" />
                  {t("nav.admin")}
                </a>
              )}

              {session?.user ? (
                <>
                  {/* 用户所在城市 - 仅定位成功时显示 */}
                  {userCity && (
                    <div className="flex items-center gap-1 text-sm" style={{ color: "#666666" }}>
                      <MapPin className="h-4 w-4" style={{ color: "#FF6B35" }} />
                      <span>{userCity}</span>
                    </div>
                  )}

                  {/* 用户菜单 */}
                  <div className="relative" data-user-menu>
                    <button
                      type="button"
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-accent hover:text-foreground transition-colors duration-150"
                    >
                      {/* 用户头像 */}
                      <Avatar
                        src={session.user.image}
                        name={session.user.nickname || session.user.name}
                        size="xs"
                      />
                      <span className="max-w-[80px] truncate">{session.user.nickname || session.user.name}</span>
                      <ChevronDown
                        className={cn("h-3.5 w-3.5 transition-transform duration-200", showUserMenu && "rotate-180")}
                      />
                    </button>

                    {/* 下拉菜单 */}
                    {showUserMenu && (
                      <div
                        className="absolute right-0 top-full mt-1.5 w-44 rounded-xl overflow-hidden bg-popover border border-border shadow-lg z-50"
                        style={{
                          animation: "fade-up 0.15s cubic-bezier(0.16,1,0.3,1) both",
                        }}
                      >
                        <a
                          href="/profile"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {t("nav.profile")}
                        </a>
                        <a
                          href="/my-teams"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Mountain className="h-3.5 w-3.5 text-muted-foreground" />
                          {t("nav.myTeams")}
                        </a>
                        <a
                          href="/favorites"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                          {t("nav.myFavorites")}
                        </a>
                        <div className="border-t border-border my-1" />
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          {t("nav.logout")}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 主 CTA：发布队伍 */}
                  <CtaButton href="/teams/create" label={t("nav.createTeam")} icon={<Plus className="h-4 w-4" />} />
                </>
              ) : (
                <>
                  <a
                    href="/login"
                    className="text-sm font-medium text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-accent hover:text-foreground transition-colors duration-150"
                  >
                    {t("nav.login")}
                  </a>
                  <CtaButton href="/register" label={t("nav.register")} />
                </>
              )}
            </div>

            {/* ---- 移动端汉堡按钮 ---- */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? t("common.closeMenu") : t("common.openMenu")}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

          </div>
        </div>
      </header>

      {/* ============================================================
          移动端抽屉菜单
          ============================================================ */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* 遮罩 */}
          <div
            className="absolute inset-0 bg-[#1e1812]/20 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* 抽屉面板：右侧滑入 */}
          <div
            className="absolute right-0 top-0 bottom-0 w-72 flex flex-col bg-popover border-l border-border shadow-2xl"
            style={{
              animation: "slide-in-right 0.35s cubic-bezier(0.16,1,0.3,1) forwards",
            }}
          >
            {/* 顶部：Logo + 关闭 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <a href="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                <Mountain className="h-5 w-5 text-primary" />
                <span className="font-bold text-foreground">GoMate</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
                aria-label={t("common.closeMenu")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 用户信息（已登录时显示） */}
            {session?.user && (
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={session.user.image}
                    name={session.user.nickname || session.user.name}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{session.user.nickname || session.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                    {/* 移动端城市显示 */}
                    {userCity && (
                      <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#666666" }}>
                        <MapPin className="h-3 w-3" style={{ color: "#FF6B35" }} />
                        {userCity}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 导航链接 */}
            <nav className="flex flex-col px-3 py-3 gap-0.5" aria-label={t("common.mobileNav")}>
              {navLinks(t).map((link, i) => {
                const active = isActive(link.href);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "block px-4 py-3 text-base font-medium rounded-xl transition-colors duration-150",
                      "animate-[fade-up_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0",
                      active
                        ? "text-primary bg-accent"
                        : "text-foreground hover:bg-accent hover:text-primary",
                      `stagger-${i + 1}`
                    )}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>

            {/* 底部操作按钮 */}
            <div className="mt-auto flex flex-col gap-3 px-4 pb-8 pt-4 border-t border-border">
              {/* 语言切换（移动端） */}
              <div className="flex items-center justify-center gap-3 py-2">
                {SUPPORTED_LOCALES.map((locale) => (
                  <MobileLangButton key={locale} locale={locale} />
                ))}
              </div>
              {session?.user ? (
                <>
                  <a
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl hover:bg-accent transition-colors font-medium text-sm"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    {t("nav.profile")}
                  </a>
                  <a
                    href="/my-teams"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl hover:bg-accent transition-colors font-medium text-sm"
                  >
                    <Mountain className="h-4 w-4 text-muted-foreground" />
                    {t("nav.myTeams")}
                  </a>
                  <a
                    href="/favorites"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl hover:bg-accent transition-colors font-medium text-sm"
                  >
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    {t("nav.myFavorites")}
                  </a>
                  <a
                    href="/teams/create"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
                  >
                    <Plus className="h-4 w-4" />
                    {t("nav.createTeam")}
                  </a>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {t("nav.logout")}
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl hover:bg-accent transition-colors font-medium text-sm"
                  >
                    <User className="h-4 w-4" />
                    {t("nav.login")}
                  </a>
                  <a
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl font-medium text-sm bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
                  >
                    {t("nav.register")}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---- 品牌绿主 CTA 按钮 ---- */
function CtaButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.97] bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
    >
      {icon}
      {label}
    </a>
  );
}

/**
 * Navbar Skeleton - i18n 加载时显示
 */
function NavbarSkeleton({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo 区域 */}
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-slate-700 skeleton-shimmer" />
            <div className="h-6 w-20 rounded bg-slate-200 dark:bg-slate-700 skeleton-shimmer" />
          </div>

          {/* 桌面端导航链接 */}
          <nav className="hidden md:flex items-center gap-1">
            <div className="h-8 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 skeleton-shimmer" style={{ animationDelay: "50ms" }} />
            <div className="h-8 w-20 rounded-lg bg-slate-200 dark:bg-slate-700 skeleton-shimmer" style={{ animationDelay: "100ms" }} />
            <div className="h-8 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 skeleton-shimmer" style={{ animationDelay: "150ms" }} />
          </nav>

          {/* 桌面端操作区 */}
          <div className="hidden md:flex items-center gap-2">
            <div className="h-8 w-20 rounded-lg bg-slate-200 dark:bg-slate-700 skeleton-shimmer" style={{ animationDelay: "200ms" }} />
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 skeleton-shimmer" style={{ animationDelay: "250ms" }} />
            <div className="h-9 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 skeleton-shimmer" style={{ animationDelay: "300ms" }} />
            <div className="h-9 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 skeleton-shimmer" style={{ animationDelay: "350ms" }} />
          </div>

          {/* 移动端汉堡按钮占位 */}
          <div className="md:hidden h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 skeleton-shimmer" />
        </div>
      </div>
    </header>
  );
}

/** 移动端语言切换按钮 */
function MobileLangButton({ locale }: { locale: Locale }) {
  const isActive = locale === getLocale();
  const handleClick = () => {
    setLocale(locale);
    const path = window.location.pathname;
    const segments = path.split("/").filter(Boolean);
    const firstSegment = segments[0] as Locale | undefined;
    const hasPrefix = SUPPORTED_LOCALES.includes(firstSegment as Locale);

    let newPath: string;
    if (locale === "zh-CN") {
      newPath = hasPrefix ? "/" + segments.slice(1).join("/") : path;
      if (!newPath.startsWith("/")) newPath = "/" + newPath;
    } else {
      if (hasPrefix) {
        segments[0] = locale;
        newPath = "/" + segments.join("/");
      } else {
        newPath = "/" + locale + path;
      }
    }
    if (!newPath || newPath === "/") newPath = locale === "zh-CN" ? "/" : "/" + locale;
    window.location.href = newPath;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "bg-accent text-muted-foreground hover:text-foreground"
      }`}
    >
      {getLocaleName(locale)}
    </button>
  );
}
