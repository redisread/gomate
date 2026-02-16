"use client";

import * as React from "react";
import Link from "next/link";
import { Mountain, Instagram, Twitter, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const footerLinks = {
  product: [
    { label: "探索地点", href: "#locations" },
    { label: "找队伍", href: "#teams" },
    { label: "路线攻略", href: "#guides" },
    { label: "安全保障", href: "#safety" },
  ],
  company: [
    { label: "关于我们", href: "#about" },
    { label: "加入团队", href: "#careers" },
    { label: "联系我们", href: "#contact" },
    { label: "合作伙伴", href: "#partners" },
  ],
  support: [
    { label: "帮助中心", href: "#help" },
    { label: "安全指南", href: "#safety-guide" },
    { label: "社区规范", href: "#guidelines" },
    { label: "隐私政策", href: "#privacy" },
  ],
};

const socialLinks = [
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: MessageCircle, href: "#", label: "WeChat" },
];

function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Mountain className="h-6 w-6 text-stone-100" />
              <span className="text-lg font-bold text-stone-100">GoMate</span>
            </Link>
            <p className="text-sm text-stone-400 mb-6 max-w-xs">
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

          {/* Product Links */}
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

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-stone-100 mb-4">公司</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
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

          {/* Support Links */}
          <div>
            <h3 className="text-sm font-semibold text-stone-100 mb-4">支持</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
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

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-stone-500">
            &copy; {new Date().getFullYear()} GoMate. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="#terms"
              className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
            >
              服务条款
            </Link>
            <Link
              href="#privacy"
              className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
            >
              隐私政策
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { Footer };
