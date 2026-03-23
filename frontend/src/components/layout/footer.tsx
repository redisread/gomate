import * as React from "react";
import { Mountain, Heart, Mail, ArrowRight } from "lucide-react";
import { copy } from "@/lib/copy";

/**
 * 页脚组件 — 干净收尾版
 * 结构：品牌小行 + 精简四列导航 + 版权栏
 * 注：情感召唤 CTA 已由首页 CTA Section 承担，Footer 不重复
 */
export function Footer() {
  return (
    <footer
      className="relative overflow-hidden"
      style={{ background: "#FDFAF6", borderTop: "1px solid #F0EBE3" }}
    >
      {/* 背景装饰：极淡山形纹 */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <svg
          className="absolute bottom-0 left-0 w-full opacity-[0.03]"
          viewBox="0 0 1440 120"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M0 120L180 80L360 100L540 50L720 70L900 20L1080 45L1260 10L1440 30V120H0Z"
            fill="#2C1810"
          />
        </svg>
      </div>

      <div className="relative max-w-5xl mx-auto px-6 sm:px-8">

        {/* ── 品牌行 + 四列导航 ── */}
        <div className="pt-12 pb-10 grid grid-cols-1 md:grid-cols-12 gap-8">

          {/* 品牌区（占 3 列） */}
          <div className="md:col-span-3">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)" }}
              >
                <Mountain className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-base tracking-tight" style={{ color: "#2C1810" }}>
                GoMate
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#D4C4B8" }}>
              发现有趣的地方，<br />找到同行的人。
            </p>
          </div>

          {/* 间距占位 */}
          <div className="hidden md:block md:col-span-1" />

          {/* 探索（占 2 列） */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-semibold mb-4 tracking-widest uppercase" style={{ color: "#C4A898" }}>
              探索
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "/locations",    label: "探索地点" },
                { href: "/teams",        label: "找队伍" },
                { href: "/teams/create", label: "发布队伍" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a href={href} className="footer-link text-sm" style={{ color: "#8B6F5E" }}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 关于（占 2 列） */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-semibold mb-4 tracking-widest uppercase" style={{ color: "#C4A898" }}>
              关于
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "/about",   label: "关于我们" },
                { href: "/contact", label: "联系我们" },
                { href: "/careers", label: "加入团队" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a href={href} className="footer-link text-sm" style={{ color: "#8B6F5E" }}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 支持 + 联系（占 2 列） */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-semibold mb-4 tracking-widest uppercase" style={{ color: "#C4A898" }}>
              支持
            </h3>
            <ul className="space-y-2.5 mb-6">
              {[
                { href: "/help",       label: "帮助中心" },
                { href: "/privacy",    label: copy.footer.supportPrivacy },
                { href: "/terms",      label: copy.footer.terms },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a href={href} className="footer-link text-sm" style={{ color: "#8B6F5E" }}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>

            {/* 联系邮件 */}
            <a
              href="mailto:hi@gomate.live"
              className="inline-flex items-center gap-2 group"
              style={{ color: "#C4A898" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#E8845A"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#C4A898"; }}
            >
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-xs font-medium transition-colors duration-150">hi@gomate.live</span>
            </a>
          </div>

        </div>

        {/* ── 版权栏 ── */}
        <div
          className="border-t py-5 flex flex-col sm:flex-row items-center justify-between gap-2"
          style={{ borderColor: "#F0EBE3" }}
        >
          <p className="text-xs" style={{ color: "#C4A898" }}>
            © {new Date().getFullYear()} {copy.footer.copyright}
          </p>

          <p className="text-xs flex items-center gap-1" style={{ color: "#C4A898" }}>
            Made with{" "}
            <Heart
              className="h-3 w-3"
              style={{ color: "#E8845A", fill: "#E8845A" }}
            />
            {" "}for 每一个想找搭子的你
          </p>
        </div>

      </div>

      {/* 链接 hover 样式 */}
      <style>{`
        .footer-link {
          position: relative;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .footer-link::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          width: 100%;
          height: 1px;
          background: #E8845A;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.2s ease;
        }
        .footer-link:hover {
          color: #E8845A !important;
        }
        .footer-link:hover::after {
          transform: scaleX(1);
        }
      `}</style>
    </footer>
  );
}
