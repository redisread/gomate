"use client";

import * as React from "react";
import { Mountain, Heart, Mail, ArrowUp, MapPin, Users, Plus, FileText, MessageSquare } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

/**
 * 移动端 Footer - 现代化简洁设计
 * 特点：分组清晰、视觉层次分明、 touch-friendly
 */

export function FooterMobile() {
  const { t } = useI18n(["common"]);
  const year = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 链接分组配置
  const footerSections = [
    {
      title: "探索",
      links: [
        { href: "/locations", label: t("common.exploreLocations"), icon: MapPin },
        { href: "/teams", label: t("common.exploreTeams"), icon: Users },
        { href: "/teams/create", label: t("common.exploreCreate"), icon: Plus },
      ],
    },
    {
      title: "支持",
      links: [
        { href: "/about", label: t("common.supportAbout"), icon: FileText },
        { href: "/blog", label: t("common.supportBlog"), icon: FileText },
        { href: "/feedback", label: t("common.supportFeedback"), icon: MessageSquare },
        { href: "/help", label: t("common.supportHelp"), icon: FileText },
      ],
    },
    {
      title: "法律",
      links: [
        { href: "/privacy", label: t("common.legalPrivacy") },
        { href: "/terms", label: t("common.legalTerms") },
      ],
    },
  ];

  return (
    <footer className="bg-gradient-to-b from-background to-stone-50 dark:to-stone-950 border-t border-border/50">
      {/* 主内容区 */}
      <div className="px-5 pt-8 pb-6">
        {/* Logo 和品牌区 */}
        <div className="flex items-center gap-2.5 mb-6">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-400) 100%)" }}
          >
            <Mountain className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-bold text-base text-foreground">GoMate</span>
        </div>

        {/* 链接分组 - 手风琴式 */}
        <div className="space-y-1">
          {footerSections.map((section) => (
            <FooterSection key={section.title} {...section} />
          ))}
        </div>

        {/* 联系邮箱 */}
        <a
          href={`mailto:${t("common.contactEmail")}`}
          className="flex items-center gap-2 mt-6 py-3 px-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/30 dark:border-amber-900/30"
        >
          <Mail className="h-4 w-4 text-amber-700" />
          <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
            {t("common.contactEmail")}
          </span>
        </a>
      </div>

      {/* 底部栏 */}
      <div className="border-t border-border/50 px-5 py-4">
        {/* 回到顶部 */}
        <button
          onClick={scrollToTop}
          className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 mb-4 hover:text-foreground transition-colors"
        >
          <ArrowUp className="h-3.5 w-3.5" />
          {t("common.backToTop")}
        </button>

        {/* 版权信息 */}
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-stone-600/70 dark:text-stone-400/70">
            © {year} {t("common.copyright")}
          </p>
          <p className="text-xs flex items-center gap-1 text-stone-600/60 dark:text-stone-400/60">
            Made with
            <Heart className="h-3 w-3 text-amber-700 dark:text-amber-400" fill="currentColor" />
            {t("common.madeWithLove")}
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * 可折叠的 Footer 分组组件
 */
interface FooterSectionProps {
  title: string;
  links: Array<{
    href: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
  }>;
}

function FooterSection({ title, links }: FooterSectionProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-3.5 text-left"
        aria-expanded={isOpen}
      >
        <span
          className="text-sm font-semibold tracking-wide text-stone-700 dark:text-stone-300"
        >
          {title}
        </span>
        <svg
          className={`h-4 w-4 text-stone-600 dark:text-stone-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* 可折叠内容 */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="pb-4 space-y-3">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <a
                href={href}
                className="flex items-center gap-2.5 text-sm text-stone-600 dark:text-stone-400 hover:text-foreground transition-colors py-1"
              >
                {Icon && <Icon className="h-3.5 w-3.5 opacity-60" />}
                <span>{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
