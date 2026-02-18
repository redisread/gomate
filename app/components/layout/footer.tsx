"use client";

import * as React from "react";
import Link from "next/link";
import { Mountain, Twitter, MessageCircle } from "lucide-react";

// 即刻图标
const JikeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
    <circle cx="12" cy="12" r="5"/>
  </svg>
);

// 小红书图标
const XiaohongshuIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.615 14.154h-1.846v-3.077h-1.538v3.077h-2.462v-3.077H9.231v3.077H7.385V7.846h1.846v3.077h1.538V7.846h2.462v3.077h1.538V7.846h1.846v8.308z"/>
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
  { icon: Twitter, href: "https://x.com/VictorHong1022", label: "Twitter" },
  { icon: JikeIcon, href: "https://okjk.co/Z73r9S", label: "即刻" },
  { icon: XiaohongshuIcon, href: "https://xhslink.com/m/7Fx4uIYo2lv", label: "小红书" },
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
