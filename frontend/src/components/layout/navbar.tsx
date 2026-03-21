"use client";

import * as React from "react";
import { Mountain, Menu, X, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

const navLinks = [
  { href: "/", label: copy.nav.home },
  { href: "/locations", label: copy.nav.locations },
  { href: "/teams", label: copy.nav.teams },
];

interface NavbarProps {
  className?: string;
}

/**
 * 响应式导航栏 - React Island，client:load
 */
export function Navbar({ className }: NavbarProps) {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [session, setSession] = React.useState<{
    user?: { name: string; email: string; image?: string };
    isAdmin?: boolean;
  } | null>(null);

  // 监听滚动
  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 获取会话（路径与后端挂载点 /auth 对齐）
  React.useEffect(() => {
    fetch(
      `${import.meta.env.PUBLIC_API_URL || "http://localhost:8799"}/auth/get-session`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) setSession(data);
      })
      .catch(() => {});
  }, []);

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
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled ? "bg-white/90 backdrop-blur-md shadow-sm" : "bg-transparent",
          className
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 group">
              <Mountain className="h-7 w-7 text-stone-800 group-hover:text-stone-600 transition-colors" />
              <span className="text-xl font-bold text-stone-800 tracking-tight">
                GoMate
              </span>
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors relative group"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-stone-800 transition-all group-hover:w-full" />
                </a>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              {session?.isAdmin && (
                <a href="/admin/locations">
                  <button className="flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-colors">
                    <Settings className="h-4 w-4" />
                    {copy.nav.admin}
                  </button>
                </a>
              )}
              {session?.user ? (
                <>
                  <a href="/profile">
                    <button className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-colors">
                      <User className="h-4 w-4" />
                      {session.user.name}
                    </button>
                  </a>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-colors"
                  >
                    {copy.nav.logout}
                  </button>
                  <a href="/teams/create">
                    <button className="text-sm bg-stone-800 hover:bg-stone-700 text-white px-4 py-1.5 rounded-md transition-colors">
                      {copy.nav.createTeam}
                    </button>
                  </a>
                </>
              ) : (
                <>
                  <a href="/login">
                    <button className="text-sm text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-colors">
                      {copy.nav.login}
                    </button>
                  </a>
                  <a href="/locations">
                    <button className="text-sm bg-stone-800 hover:bg-stone-700 text-white px-4 py-1.5 rounded-md transition-colors">
                      {copy.nav.explore}
                    </button>
                  </a>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-stone-600 hover:text-stone-900 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-xl">
            <div className="flex flex-col h-full pt-20 px-6 pb-6">
              <nav className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block py-3 text-lg font-medium text-stone-800 hover:text-stone-600 transition-colors border-b border-stone-100"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-3">
                {session?.user ? (
                  <>
                    <a href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                      <button className="w-full flex items-center justify-center gap-2 border border-stone-200 text-stone-800 px-4 py-2 rounded-md hover:bg-stone-50 transition-colors">
                        <User className="h-4 w-4" />
                        {copy.nav.profile}
                      </button>
                    </a>
                    <button
                      onClick={handleLogout}
                      className="w-full border border-stone-200 text-stone-800 px-4 py-2 rounded-md hover:bg-stone-50 transition-colors"
                    >
                      {copy.nav.logout}
                    </button>
                  </>
                ) : (
                  <>
                    <a href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <button className="w-full flex items-center justify-center gap-2 border border-stone-200 text-stone-800 px-4 py-2 rounded-md hover:bg-stone-50 transition-colors">
                        <User className="h-4 w-4" />
                        {copy.nav.login}
                      </button>
                    </a>
                    <a href="/locations" onClick={() => setIsMobileMenuOpen(false)}>
                      <button className="w-full bg-stone-800 hover:bg-stone-700 text-white px-4 py-2 rounded-md transition-colors">
                        {copy.nav.explore}
                      </button>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
