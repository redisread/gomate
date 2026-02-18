"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mountain, Menu, X, User, LogOut, Plus, Users, Settings, Crown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface NavbarProps {
  className?: string;
}

const navLinks = [
  { href: "/", label: "首页" },
  { href: "/#locations", label: "探索地点" },
  { href: "/#teams", label: "找队伍" },
  { href: "/about", label: "关于我们" },
];

function Navbar({ className }: NavbarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  // 点击外部关闭用户菜单
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-white/90 backdrop-blur-md shadow-sm"
            : "bg-transparent",
          className
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <motion.div
                whileHover={{ rotate: 15 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Mountain className="h-7 w-7 text-stone-800 group-hover:text-stone-600 transition-colors" />
              </motion.div>
              <span className="text-xl font-bold text-stone-800 tracking-tight">
                GoMate
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors relative group"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-stone-800 transition-all group-hover:w-full" />
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated && user ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-stone-300 text-stone-700"
                    asChild
                  >
                    <Link href="/teams/create">
                      <Plus className="h-4 w-4 mr-1" />
                      发布队伍
                    </Link>
                  </Button>
                  <div className="relative user-menu-container">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 p-1 rounded-full hover:bg-stone-100 transition-colors"
                    >
                      <Avatar className="h-8 w-8 border border-stone-200">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-stone-700 max-w-[80px] truncate">
                        {user.name}
                      </span>
                    </button>

                    {/* User Dropdown Menu */}
                    <AnimatePresence>
                      {showUserMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-50"
                        >
                          <div className="px-4 py-3 border-b border-stone-100">
                            <p className="text-sm font-medium text-stone-900">{user.name}</p>
                            <p className="text-xs text-stone-500 truncate">{user.email}</p>
                          </div>

                          {/* Menu Items */}
                          <Link
                            href="/profile"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                          >
                            <Settings className="h-4 w-4 text-stone-400" />
                            个人资料
                          </Link>

                          <Link
                            href="/my-teams"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                          >
                            <Users className="h-4 w-4 text-stone-400" />
                            我的队伍
                          </Link>

                          <div className="border-t border-stone-100 my-1" />

                          <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            退出登录
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="text-stone-600" asChild>
                    <Link href="/login">登录</Link>
                  </Button>
                  <Button
                    size="sm"
                    className="bg-stone-800 hover:bg-stone-700 text-white"
                    asChild
                  >
                    <Link href="/register">注册</Link>
                  </Button>
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
      </motion.header>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={{
          opacity: isMobileMenuOpen ? 1 : 0,
          pointerEvents: isMobileMenuOpen ? "auto" : "none",
        }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 md:hidden"
      >
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <motion.div
          initial={false}
          animate={{
            x: isMobileMenuOpen ? 0 : "100%",
          }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-xl"
        >
          <div className="flex flex-col h-full pt-20 px-6 pb-6">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{
                    opacity: isMobileMenuOpen ? 1 : 0,
                    x: isMobileMenuOpen ? 0 : 20,
                  }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block py-3 text-lg font-medium text-stone-800 hover:text-stone-600 transition-colors border-b border-stone-100"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3">
              {isAuthenticated && user ? (
                <>
                  {/* User Info */}
                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-900 truncate">{user.name}</p>
                      <p className="text-xs text-stone-500 truncate">{user.email}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-stone-400" />
                  </Link>

                  {/* Menu Items */}
                  <Link
                    href="/my-teams"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors"
                  >
                    <Users className="h-5 w-5 text-stone-500" />
                    <span className="font-medium">我的队伍</span>
                  </Link>

                  <Button
                    variant="outline"
                    className="w-full justify-center"
                    asChild
                  >
                    <Link href="/teams/create" onClick={() => setIsMobileMenuOpen(false)}>
                      <Plus className="h-4 w-4 mr-2" />
                      发布队伍
                    </Link>
                  </Button>

                  <div className="border-t border-stone-100 my-1" />

                  <Button
                    variant="outline"
                    className="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    退出登录
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full justify-center" asChild>
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <User className="h-4 w-4 mr-2" />
                      登录
                    </Link>
                  </Button>
                  <Button className="w-full justify-center bg-stone-800 hover:bg-stone-700" asChild>
                    <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                      注册
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

export { Navbar };
