"use client";

import MenuPrimitive from "@starwind-ui/react/menu";
import { Dropdown, DropdownTrigger, DropdownContent } from "@/components/starwind-react/dropdown";
import { Skeleton as SwSkeleton } from "@/components/starwind-react/skeleton";
import { Modal } from "@/components/ui/modal";
import { Button as SwButton } from "@/components/starwind-react/button";

import { BrandIcon } from "@/components/brand-icon";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import {
  Mountain,
  MapPinPlus,
  Menu,
  X,
  User,
  Settings,
  Plus,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchCurrentUser, refreshCurrentUser } from "@/lib/api";
import type { SessionUser } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { useI18n } from "@/hooks/useI18n";

const navLinks = (t: (key: string) => string) => [
  { href: "/", label: t("nav.home") },
  { href: "/locations", label: t("nav.locations") },
  { href: "/teams", label: t("nav.teams") },
];

interface NavbarProps {
  className?: string;
  adminQuickActionLabel?: string;
  renderAdminQuickAction?: (props: {
    open: boolean;
    onClose: () => void;
    returnFocusRef: React.RefObject<HTMLElement | null>;
  }) => React.ReactNode;
}

type NavbarUser = Pick<
  SessionUser,
  "id" | "name" | "nickname" | "email" | "image"
>;

/**
 * 响应式导航栏（Design System v3.0）
 * - 滚动前透明；滚动后毛玻璃（暖白 + blur）
 * - 活跃链接：品牌琥珀下划线 + 高亮文字
 * - Logo：GoMate 同行足迹图标 + 品牌琥珀渐变文字
 * - 主 CTA：品牌琥珀按钮 + 琥珀色光晕
 * - 移动端：从右侧 slide-in 抽屉
 * - 用户菜单：点击或键盘展开个人选项
 */
export function Navbar({
  className,
  renderAdminQuickAction,
  adminQuickActionLabel,
}: NavbarProps) {
  const { t } = useI18n(["nav", "common"]);
  // SSR/CSR 初始状态必须一致，避免 hydration mismatch
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [quickActionOpen, setQuickActionOpen] = React.useState(false);
  const userMenuButtonRef = React.useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = React.useRef<HTMLButtonElement>(null);
  const quickActionReturnRef = React.useRef<HTMLElement | null>(null);
  const closeQuickAction = React.useCallback(
    () => setQuickActionOpen(false),
    [],
  );
  const openQuickAction = (mobile: boolean) => {
    quickActionReturnRef.current = mobile
      ? mobileMenuButtonRef.current
      : userMenuButtonRef.current;
    setShowUserMenu(false);
    setIsMobileMenuOpen(false);
    setQuickActionOpen(true);
  };

  const [currentPath, setCurrentPath] = React.useState("");
  const [session, setSession] = React.useState<
    | {
        user: NavbarUser;
        isAdmin: boolean;
      }
    | null
    | undefined
  >(undefined);

  // 获取当前路径（使用静态值避免 hydration mismatch）
  React.useEffect(() => {
    // 只在客户端执行，避免 SSR/CSR 不一致
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
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

  const [sessionFailed, setSessionFailed] = React.useState(false);
  const updateSession = React.useCallback((refresh: boolean) => {
    const request = refresh ? refreshCurrentUser() : fetchCurrentUser();
    void request
      .then((u) => {
        setSessionFailed(false);
        if (u?.role !== "admin") setQuickActionOpen(false);
        setSession(
          u
            ? {
                user: u,
                isAdmin: u.role === "admin",
              }
            : null,
        );
      })
      .catch(() => setSessionFailed(true));
  }, []);

  // 获取登录会话，并在页面恢复后重新读取，避免旧访客态永久驻留。
  React.useEffect(() => {
    updateSession(false);

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) updateSession(true);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") updateSession(true);
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [updateSession]);

  const handleLogout = async () => {
    await authClient.signOut();
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
  const adminItems = (mobile: boolean) => {
    const AdminLink = mobile ? "a" : MenuPrimitive.LinkItem;
    const QuickAction = mobile ? "button" : MenuPrimitive.Item;
    return session?.isAdmin ? (
      <>
        <div role="separator" className="my-1 border-t border-border" />
        <AdminLink
          href="/admin"
          data-testid={mobile ? "nav-admin-mobile" : "nav-admin"}
          className="flex min-h-11 items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
          onClick={() => {
            setShowUserMenu(false);
            setIsMobileMenuOpen(false);
          }}
        >
          <Settings
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          {t("nav.admin")}
        </AdminLink>
        {renderAdminQuickAction && (
          <QuickAction
            onClick={() => openQuickAction(mobile)}
            aria-haspopup="dialog"
            className="flex min-h-11 w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <MapPinPlus
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            {adminQuickActionLabel}
          </QuickAction>
        )}
      </>
    ) : null;
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-300 ease-out",
          isScrolled ? "navbar-glass shadow-warm-sm" : "bg-transparent",
          className,
        )}
        suppressHydrationWarning
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* ---- Logo ---- */}
            <a
              href="/"
              data-testid="nav-logo"
              className="flex min-h-11 items-center gap-2.5 group shrink-0"
              aria-label="GoMate"
            >
              <BrandIcon size={32} />
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
                    data-testid={`nav-link-${link.href.replace(/\//g, "-") || "home"}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative px-3.5 py-2 text-sm font-medium rounded-lg transition-colors duration-150",
                      // task #180 a11y：active text-primary (#D97706) on bg-accent (#fffbeb) = ~3.07:1 挂；amber-800 = ~6.8:1
                      // inactive muted-foreground 14px 挂；stone-700 dark:stone-300 稳过
                      active
                        ? "text-amber-800 dark:text-amber-300 bg-accent"
                        : "text-stone-700 dark:text-stone-300 hover:text-foreground hover:bg-accent",
                    )}
                  >
                    {link.label}
                    {/* 活跃下划线 */}
                    {active && (
                      <span className="absolute bottom-0.5 left-3.5 right-3.5 h-0.5 rounded-full bg-primary" />
                    )}
                  </a>
                );
              })}
            </nav>

            {/* ---- 桌面端操作区 ---- */}
            <div className="hidden md:flex items-center gap-2">
              {/* 语言切换 */}
              <LocaleToggle />

              {/* 主题切换 */}
              <ThemeToggle />

              {sessionFailed ? (
                <SwButton variant="plain" size="inherit"
                  type="button"
                  className="min-h-11 underline"
                  onClick={() => updateSession(true)}
                >
                  {t("common.retry")}
                </SwButton>
              ) : session === undefined ? (
                <div
                  className="flex items-center gap-2"
                  data-testid="nav-auth-loading"
                  aria-hidden="true"
                >
                  <SwSkeleton className="h-9 w-16 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
                  <SwSkeleton className="h-9 w-24 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
                </div>
              ) : session?.user ? (
                <>
                  {/* 用户菜单 */}
                  <Dropdown className="relative" data-user-menu open={showUserMenu} onOpenChange={setShowUserMenu}>
                    <DropdownTrigger
                      type="button"
                      ref={userMenuButtonRef}
                      aria-expanded={showUserMenu}
                      className="flex min-h-11 items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400 px-3 py-1.5 rounded-lg hover:bg-accent hover:text-foreground transition-colors duration-150"
                    >
                      {/* 用户头像 */}
                      <Avatar
                        src={session.user.image}
                        name={session.user.nickname || session.user.name}
                        size="xs"
                      />
                      <span
                        title={session.user.nickname || session.user.name}
                        className="max-w-[80px] truncate"
                      >
                        {session.user.nickname || session.user.name}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200",
                          showUserMenu && "rotate-180",
                        )}
                      />
                    </DropdownTrigger>

                    {/* 下拉菜单 */}
                    <DropdownContent disablePortal align="end"
                        className="w-52 p-0 rounded-xl overflow-hidden bg-popover border border-border shadow-lg z-50"
                      >
                        <MenuPrimitive.LinkItem
                          href="/profile"
                          className="flex min-h-11 items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {t("nav.profile")}
                        </MenuPrimitive.LinkItem>
                        <MenuPrimitive.LinkItem
                          href="/my-teams"
                          className="flex min-h-11 items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Mountain className="h-3.5 w-3.5 text-muted-foreground" />
                          {t("nav.myTeams")}
                        </MenuPrimitive.LinkItem>
                        {adminItems(false)}
                        <div
                          role="separator"
                          className="border-t border-border my-1"
                        />
                        <MenuPrimitive.Item
                          onClick={handleLogout}
                          className="w-full min-h-11 flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          {t("nav.logout")}
                        </MenuPrimitive.Item>
                      </DropdownContent>
                  </Dropdown>

                  {/* 主 CTA：发布队伍 */}
                  <CtaButton
                    href="/teams/create"
                    data-testid="nav-create-team"
                    label={t("nav.createTeam")}
                    icon={<Plus className="h-4 w-4" />}
                  />
                </>
              ) : (
                <>
                  <a
                    href="/login"
                    data-testid="nav-login"
                    // task #180 a11y：muted-foreground 14px 挂门禁；stone-700 dark:stone-300
                    className="text-sm font-medium text-stone-700 dark:text-stone-300 px-3 py-1.5 rounded-lg hover:bg-accent hover:text-foreground transition-colors duration-150"
                  >
                    {t("nav.login")}
                  </a>
                  <CtaButton
                    href="/register"
                    data-testid="nav-register"
                    label={t("nav.register")}
                  />
                </>
              )}
            </div>

            {/* ---- 移动端汉堡按钮 ---- */}
            <SwButton variant="plain" size="inherit"
              type="button"
              ref={mobileMenuButtonRef}
              data-testid="nav-mobile-menu-toggle"
              className="md:hidden min-h-11 min-w-11 p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={
                isMobileMenuOpen ? t("common.closeMenu") : t("common.openMenu")
              }
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </SwButton>
          </div>
        </div>
      </header>

      {/* ============================================================
          移动端抽屉菜单
          ============================================================ */}
      {isMobileMenuOpen && (
        <Modal open={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)}
          aria-label={t("common.mobileNav")}
          returnFocusRef={mobileMenuButtonRef}
          overlayClassName="flex justify-end md:hidden"
          backdropClassName="bg-[#1e1812]/20 backdrop-blur-sm"
          panelClassName="h-dvh w-72 overflow-y-auto flex flex-col bg-popover border-l border-border shadow-2xl motion-reduce:animate-none"
        >
            {/* 顶部：Logo + 关闭 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <a
                href="/"
                className="flex min-h-11 items-center gap-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <BrandIcon size={28} />
                <span className="font-bold text-foreground">GoMate</span>
              </a>
              <SwButton variant="plain" size="inherit"
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="min-h-11 min-w-11 p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
                aria-label={t("common.closeMenu")}
              >
                <X className="h-5 w-5" />
              </SwButton>
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
                    <p
                      title={session.user.nickname || session.user.name}
                      className="font-semibold text-foreground text-sm truncate"
                    >
                      {session.user.nickname || session.user.name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 导航链接 */}
            <nav
              className="flex flex-col px-3 py-3 gap-0.5"
              aria-label={t("common.mobileNav")}
            >
              {navLinks(t).map((link) => {
                const active = isActive(link.href);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "block px-4 py-3 text-base font-medium rounded-xl transition-colors duration-150",
                      active
                        ? "text-primary bg-accent"
                        : "text-foreground hover:bg-accent hover:text-primary",
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
              <div className="flex items-center justify-center py-2">
                <LocaleToggle />
              </div>
              {sessionFailed ? (
                <SwButton variant="plain" size="inherit"
                  type="button"
                  className="min-h-11 underline"
                  onClick={() => updateSession(true)}
                >
                  {t("common.retry")}
                </SwButton>
              ) : session === undefined ? (
                <SwSkeleton
                  className="h-24 animate-pulse rounded-xl bg-muted motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : session?.user ? (
                <>
                  <SwButton as="a" variant="plain" size="inherit"
                    href="/teams/create"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
                  >
                    <Plus className="h-4 w-4" />
                    {t("nav.createTeam")}
                  </SwButton>
                  <div>
                    <a
                      href="/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex min-h-11 w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      {t("nav.profile")}
                    </a>
                    <a
                      href="/my-teams"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex min-h-11 w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <Mountain className="h-4 w-4 text-muted-foreground" />
                      {t("nav.myTeams")}
                    </a>
                    {adminItems(true)}
                    <div role="separator" className="border-t border-border" />
                    <SwButton variant="plain" size="inherit"
                      type="button"
                      onClick={handleLogout}
                      className="w-full min-h-11 flex items-center px-4 gap-2.5 text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      {t("nav.logout")}
                    </SwButton>
                  </div>
                </>
              ) : (
                <>
                  <SwButton as="a" variant="plain" size="inherit"
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl hover:bg-accent transition-colors font-medium text-sm"
                  >
                    <User className="h-4 w-4" />
                    {t("nav.login")}
                  </SwButton>
                  <SwButton as="a" variant="plain" size="inherit"
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl font-medium text-sm bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
                  >
                    {t("nav.register")}
                  </SwButton>
                </>
              )}
            </div>
        </Modal>
      )}
      {session?.isAdmin &&
        renderAdminQuickAction?.({
          open: quickActionOpen,
          onClose: closeQuickAction,
          returnFocusRef: quickActionReturnRef,
        })}
    </>
  );
}

/* ---- 品牌琥珀主 CTA 按钮 ---- */
function CtaButton({
  href,
  label,
  icon,
  "data-testid": dataTestId,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  "data-testid"?: string;
}) {
  return (
    <SwButton as="a" variant="plain" size="inherit"
      href={href}
      data-testid={dataTestId}
      // task #180 a11y：`bg-primary` (#D97706 amber-600) on cream `#FFFBEB` primary-foreground = ~3.3:1 挂 WCAG AA 4.5:1
      // 走 amber-700 (#B45309) + text-white = ~5.5:1 稳过；不改 --primary token 避免全站隐性回归
      className="btn-brand-offset flex items-center gap-1.5 rounded-xl border border-amber-900/15 bg-amber-700 px-4 py-2 text-sm font-semibold tracking-wide text-white transition-[transform,background-color,border-color,color,opacity,box-shadow] hover:scale-[1.02] hover:bg-amber-800 active:scale-[0.96]"
    >
      {icon}
      {label}
    </SwButton>
  );
}
