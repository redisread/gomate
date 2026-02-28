"use client";

import * as React from "react";
import Link from "next/link";
import { Mountain, MessageCircle } from "lucide-react";

// X (Twitter) 图标
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

import { motion } from "framer-motion";

const footerLinks = {
  product: [
    { label: "探索地点", href: "#locations" },
    { label: "找队伍", href: "#teams" },
  ],
  about: [
    { label: "关于我们", href: "/about" },
    { label: "联系我们", href: "/contact" },
  ],
};

const socialLinks = [
  { icon: XIcon, href: "https://x.com/VictorHong1022", label: "X" },
  { icon: MessageCircle, href: "/wechat.jpg", label: "WeChat" },
];

function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="flex flex-col md:flex-row justify-between gap-12 lg:gap-16">
          {/* Brand - Left side */}
          <div className="max-w-md">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Mountain className="h-6 w-6 text-stone-100" />
              <span className="text-lg font-bold text-stone-100">GoMate</span>
            </Link>
            <p className="text-sm text-stone-400 mb-6">
              极简「地点组队」平台，让每一次户外探索都有志同道合的伙伴同行。
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-full bg-stone-800 text-stone-400 hover:text-stone-100 hover:bg-stone-700 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links - Right side */}
          <div className="flex gap-16 lg:gap-24">
            <div>
              <h3 className="text-sm font-semibold text-stone-100 mb-4">产品</h3>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-stone-400 hover:text-stone-100 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-100 mb-4">关于</h3>
              <ul className="space-y-3">
                {footerLinks.about.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-stone-400 hover:text-stone-100 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-stone-500">
            &copy; {new Date().getFullYear()} · GoMate 版权所有
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
            >
              隐私政策
            </Link>
            <Link
              href="/terms"
              className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
            >
              服务条款
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { Footer };
