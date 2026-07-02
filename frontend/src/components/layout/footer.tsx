"use client";

import * as React from "react";

const navLinks = [
  { href: "/", label: "首页" },
  { href: "/discover", label: "发现" },
  { href: "/teams", label: "队伍" },
  { href: "/locations", label: "地点" },
  { href: "/help", label: "更多" },
];

/**
 * 极简 Footer — 纯 JSX 无外部 JS 依赖
 * 样式与 footer-minimal.astro 保持一致
 */
export function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-400">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Logo */}
        <div className="flex justify-center mb-5">
          <a href="/" className="flex items-center gap-2 group">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)" }}
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.424 4.576a6 6 0 00-8.48 0l-1 1-1-1a6 6 0 10-8.48 8.48l1 1L12 22.48l8.424-8.424 1-1a6 6 0 000-8.48z"/>
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">GoMate</span>
          </a>
        </div>

        {/* 导航 */}
        <nav className="hidden md:flex flex-wrap justify-center gap-6 mb-6">
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-sm hover:text-white hover:underline underline-offset-4 transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* 社交图标 */}
        <div className="flex justify-center gap-4 mb-6">
          {/* Twitter/X */}
          <a
            href="https://twitter.com/gomate"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-125 hover:text-yellow-400 transition-all"
            aria-label="Twitter"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          {/* GitHub */}
          <a
            href="https://github.com/redisread/gomate"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-125 hover:text-yellow-400 transition-all"
            aria-label="GitHub"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
          </a>
          {/* RSS */}
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-125 hover:text-yellow-400 transition-all"
            aria-label="RSS"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.18 15.64a2.18 2.18 0 012.18 2.18C8.36 19 7.38 20 6.18 20A2.18 2.18 0 014 17.82a2.18 2.18 0 012.18-2.18M4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27zm0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93z"/>
            </svg>
          </a>
        </div>

        {/* 版权 */}
        <div className="text-center text-xs text-stone-500">
          &copy; {new Date().getFullYear()} GoMate. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
