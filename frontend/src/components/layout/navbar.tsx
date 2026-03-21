"use client";

import * as React from "react";
import { Mountain, Menu, X, User, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

const navLinks = [
  { href: "/",          label: copy.nav.home },
  { href: "/locations", label: copy.nav.locations },
  { href: "/teams",     label: copy.nav.teams },
];

interface NavbarProps {
  className?: string;
}

/**
 * 响应式导航栏（Design System v2.0）
 * - 滚动前透明；滚动后毛玻璃（沙米暖白 + blur）
 * - Logo：Mountain 图标 + 品牌绿渐变文字
 * - 主 CTA：品牌绿按钮 + 绿色光晕
 * - 移动端：从右侧 slide-in 抽屉
 */
export function Navbar({ className }: NavbarProps) {
  const [isScrolled,        setIsScrolled]        = React.useState(false);
  const [isMobileMenuOpen,  setIsMobileMenuOpen]  = React.useState(false);
  const [session,           setSession]           = React.useState<{
    user?: { name: string; email: string; image?: string };
    isAdmin?: boolean;
  } | null>(null);

  // 滚动监听
  React.useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 获取登录会话
  React.useEffect(() => {
    fetch(
      `${import.meta.env.PUBLIC_API_URL || "http://localhost:8799"}/auth/get-session`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((data) => { if (data?.user) setSession(data); })
      .catch(() => {});
  }, []);

  // 移动菜单打开时锁定滚动
  React.useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    await fetch(
      `${import.meta.env.PUBLIC_API_URL || "http://localhost:8799"}/auth/sign-out`,
      { method: "POST", credentials: "include" }
    );
    setSession(null);
    window.location.href = "/";
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
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">

            {/* ---- Logo ---- */}
            <a
              href="/"
              className="flex items-center gap-2.5 group shrink-0"
              aria-label="GoMate 首页"
            >
              <Mountain
                className="h-7 w-7 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                style={{ color: "#249a87" }}
              />
              {/* 品牌绿渐变文字 */}
              <span className="text-xl font-bold tracking-tight text-gradient-brand">
                GoMate
              </span>
            </a>

            {/* ---- 桌面端导航 ---- */}
            <nav className="hidden md:flex items-center gap-1" aria-label="主导航">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3.5 py-2 text-sm font-medium rounded-lg",
                    "text-[#8f7f6e] hover:text-[#1e1812] hover:bg-[#f0faf8]",
                    "transition-colors duration-150",
                    "[&.active]:text-[#249a87] [&.active]:bg-[#f0faf8]"
                  )}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* ---- 桌面端操作区 ---- */}
            <div className="hidden md:flex items-center gap-2">
              {session?.isAdmin && (
                <a href="/admin/locations">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm text-[#8f7f6e] px-3 py-1.5 rounded-lg hover:bg-[#f0faf8] hover:text-[#1e1812] transition-colors duration-150"
                  >
                    <Settings className="h-4 w-4" />
                    {copy.nav.admin}
                  </button>
                </a>
              )}

              {session?.user ? (
                <>
                  <a href="/profile">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-sm text-[#8f7f6e] px-3 py-1.5 rounded-lg hover:bg-[#f0faf8] hover:text-[#1e1812] transition-colors duration-150"
                    >
                      <User className="h-4 w-4" />
                      {session.user.name}
                    </button>
                  </a>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-sm text-[#8f7f6e] px-3 py-1.5 rounded-lg hover:bg-[#f0faf8] hover:text-[#1e1812] transition-colors duration-150"
                  >
                    {copy.nav.logout}
                  </button>
                  {/* 主 CTA：发布队伍 — 品牌绿 + 光晕 */}
                  <CtaButton href="/teams/create" label={copy.nav.createTeam} icon={<Plus className="h-4 w-4" />} />
                </>
              ) : (
                <>
                  <a href="/login">
                    <button
                      type="button"
                      className="text-sm font-medium text-[#8f7f6e] px-3 py-1.5 rounded-lg hover:bg-[#f0faf8] hover:text-[#1e1812] transition-colors duration-150"
                    >
                      {copy.nav.login}
                    </button>
                  </a>
                  <CtaButton href="/locations" label={copy.nav.explore} />
                </>
              )}
            </div>

            {/* ---- 移动端汉堡按钮 ---- */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-[#8f7f6e] hover:bg-[#f0faf8] hover:text-[#1e1812] transition-colors duration-150"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "关闭菜单" : "打开菜单"}
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
            className="absolute right-0 top-0 bottom-0 w-72 flex flex-col"
            style={{
              background:     "rgba(255,255,255,0.96)",
              backdropFilter: "blur(16px)",
              boxShadow:      "-4px 0 30px rgba(30,24,18,0.12)",
              animation:      "slide-in-right 0.35s cubic-bezier(0.16,1,0.3,1) forwards",
            }}
          >
            {/* 关闭按钮 */}
            <div className="flex justify-end p-4">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg text-[#8f7f6e] hover:bg-[#f0faf8] transition-colors"
                aria-label="关闭菜单"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 导航链接（stagger 出现） */}
            <nav className="flex flex-col px-4 gap-1" aria-label="移动端导航">
              {navLinks.map((link, i) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-3 text-base font-medium rounded-xl",
                    "text-[#1e1812] hover:bg-[#f0faf8] hover:text-[#249a87]",
                    "transition-colors duration-150",
                    "animate-[fade-up_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0",
                    `stagger-${i + 1}`
                  )}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* 底部操作按钮 */}
            <div className="mt-auto flex flex-col gap-3 px-4 pb-8">
              {session?.user ? (
                <>
                  <a href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 border border-[#e8e0d7] text-[#1e1812] px-4 py-2.5 rounded-xl hover:bg-[#f0faf8] transition-colors font-medium"
                    >
                      <User className="h-4 w-4" />
                      {copy.nav.profile}
                    </button>
                  </a>
                  <a href="/teams/create" onClick={() => setIsMobileMenuOpen(false)}>
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium"
                      style={{ background: "#249a87", color: "#f0faf8", boxShadow: "0 4px 14px rgba(36,154,135,0.30)" }}
                    >
                      <Plus className="h-4 w-4" />
                      {copy.nav.createTeam}
                    </button>
                  </a>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-sm text-[#8f7f6e] hover:text-[#1e1812] py-2 transition-colors"
                  >
                    {copy.nav.logout}
                  </button>
                </>
              ) : (
                <>
                  <a href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 border border-[#e8e0d7] text-[#1e1812] px-4 py-2.5 rounded-xl hover:bg-[#f0faf8] transition-colors font-medium"
                    >
                      <User className="h-4 w-4" />
                      {copy.nav.login}
                    </button>
                  </a>
                  <a href="/locations" onClick={() => setIsMobileMenuOpen(false)}>
                    <button
                      type="button"
                      className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl font-medium"
                      style={{ background: "#249a87", color: "#f0faf8", boxShadow: "0 4px 14px rgba(36,154,135,0.30)" }}
                    >
                      {copy.nav.explore}
                    </button>
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

/* ---- 品牌绿主 CTA 按钮（内部复用，避免重复） ---- */
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
    <a href={href}>
      <button
        type="button"
        className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.97]"
        style={{
          background:        "#249a87",
          color:             "#f0faf8",
          boxShadow:         "0 4px 14px rgba(36,154,135,0.30)",
          transitionDuration:"150ms",
        }}
      >
        {icon}
        {label}
      </button>
    </a>
  );
}
